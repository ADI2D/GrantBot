-- Add freelancer support to ai_cost_events table
ALTER TABLE public.ai_cost_events
  ADD COLUMN IF NOT EXISTS freelancer_user_id uuid references auth.users(id) on delete set null,
  ADD COLUMN IF NOT EXISTS freelancer_client_id uuid references public.freelancer_clients(id) on delete set null,
  ADD COLUMN IF NOT EXISTS freelancer_proposal_id uuid references public.freelancer_proposals(id) on delete set null,
  ADD COLUMN IF NOT EXISTS operation_type text; -- 'draft_generation', 'document_analysis', 'compliance_check', etc.

-- Create indexes for freelancer queries
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_freelancer_user ON public.ai_cost_events(freelancer_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_freelancer_client ON public.ai_cost_events(freelancer_client_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_freelancer_proposal ON public.ai_cost_events(freelancer_proposal_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_operation_type ON public.ai_cost_events(operation_type);

-- Add RLS policy for freelancers to view their own token usage
CREATE POLICY "freelancers view own token usage"
  ON public.ai_cost_events
  FOR SELECT
  USING (
    auth.uid() = freelancer_user_id
  );

-- Add RLS policy for admins to view all token usage
CREATE POLICY "admins view all token usage"
  ON public.ai_cost_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create a view for easy token usage queries by freelancer
CREATE OR REPLACE VIEW public.freelancer_token_usage AS
SELECT
  ace.freelancer_user_id,
  ace.freelancer_client_id,
  ace.freelancer_proposal_id,
  ace.operation_type,
  COUNT(*) as event_count,
  SUM(ace.prompt_tokens) as total_prompt_tokens,
  SUM(ace.completion_tokens) as total_completion_tokens,
  SUM(ace.total_tokens) as total_tokens,
  SUM(ace.cost_usd) as total_cost_usd,
  DATE_TRUNC('day', ace.created_at) as usage_date
FROM public.ai_cost_events ace
WHERE ace.freelancer_user_id IS NOT NULL
GROUP BY
  ace.freelancer_user_id,
  ace.freelancer_client_id,
  ace.freelancer_proposal_id,
  ace.operation_type,
  DATE_TRUNC('day', ace.created_at);

-- Grant access to the view
GRANT SELECT ON public.freelancer_token_usage TO authenticated;

-- Create a view for organization token usage (nonprofit orgs)
CREATE OR REPLACE VIEW public.organization_token_usage AS
SELECT
  ace.organization_id,
  ace.proposal_id,
  ace.template_id,
  COUNT(*) as event_count,
  SUM(ace.prompt_tokens) as total_prompt_tokens,
  SUM(ace.completion_tokens) as total_completion_tokens,
  SUM(ace.total_tokens) as total_tokens,
  SUM(ace.cost_usd) as total_cost_usd,
  DATE_TRUNC('day', ace.created_at) as usage_date
FROM public.ai_cost_events ace
WHERE ace.organization_id IS NOT NULL
GROUP BY
  ace.organization_id,
  ace.proposal_id,
  ace.template_id,
  DATE_TRUNC('day', ace.created_at);

-- Grant access to the view
GRANT SELECT ON public.organization_token_usage TO authenticated;

-- Add RLS to views
ALTER VIEW public.freelancer_token_usage SET (security_invoker = true);
ALTER VIEW public.organization_token_usage SET (security_invoker = true);
