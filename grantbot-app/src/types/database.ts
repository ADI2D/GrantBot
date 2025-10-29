export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          mission: string | null;
          impact_summary: string | null;
          differentiator: string | null;
          annual_budget: number | null;
          onboarding_completion: number | null;
          document_metadata: unknown;
          plan_id: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
        };
      };
      org_members: {
        Row: {
          id: number;
          organization_id: string;
          user_id: string | null;
          role: string | null;
        };
      };
      opportunities: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          focus_area: string | null;
          amount: number | null;
          deadline: string | null;
          alignment_score: number | null;
          status: string | null;
          compliance_notes: string | null;
        };
      };
      proposals: {
        Row: {
          id: string;
          organization_id: string;
          opportunity_id: string | null;
          owner_name: string | null;
          status: string | null;
          progress: number | null;
          due_date: string | null;
          checklist_status: string | null;
          confidence: number | null;
          compliance_summary: unknown;
          created_at: string | null;
          updated_at: string | null;
        };
      };
      proposal_sections: {
        Row: {
          id: string;
          proposal_id: string;
          title: string;
          token_count: number | null;
          content: string | null;
        };
      };
      outcomes: {
        Row: {
          id: string;
          organization_id: string;
          proposal_id: string | null;
          status: string | null;
          award_amount: number | null;
          learning_insight: string | null;
          recorded_at: string | null;
        };
      };
      admin_users: {
        Row: {
          user_id: string;
          role: "super_admin" | "support" | "developer" | "read_only";
          created_at: string | null;
        };
      };
      admin_audit_logs: {
        Row: {
          id: number;
          actor_user_id: string | null;
          actor_role: "super_admin" | "support" | "developer" | "read_only" | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: unknown;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string | null;
        };
      };
      billing_payments: {
        Row: {
          id: number;
          organization_id: string;
          stripe_invoice_id: string;
          stripe_customer_id: string;
          amount: number | null;
          currency: string | null;
          status: string | null;
          due_date: string | null;
          paid_at: string | null;
          metadata: unknown;
          created_at: string | null;
        };
      };
    };
  };
};
