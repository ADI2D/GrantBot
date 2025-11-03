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
          archived: boolean | null;
          deleted_at: string | null;
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
      pricing_plans: {
        Row: {
          id: string;
          name: string;
          monthly_price_cents: number;
          max_proposals_per_month: number;
          description: string | null;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          active: boolean;
          seat_limit: number | null;
          max_opportunities: number | null;
          max_documents: number | null;
          allow_ai: boolean | null;
          allow_analytics: boolean | null;
          features: unknown;
          created_at: string | null;
          updated_at: string | null;
        };
      };
      freelancer_proposals: {
        Row: {
          id: string;
          freelancer_user_id: string;
          client_id: string;
          client_name: string;
          title: string;
          status: string;
          due_date: string | null;
          owner_name: string | null;
          draft_html: string | null;
          checklist: unknown;
          sections: unknown;
          ai_prompts: unknown;
          last_edited_at: string | null;
          submitted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
      };
      support_tickets: {
        Row: {
          id: number;
          organization_id: string;
          subject: string;
          status: string;
          priority: string;
          opened_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
      };
      support_ticket_events: {
        Row: {
          id: number;
          ticket_id: number;
          event_type: string;
          message: string;
          metadata: unknown;
          actor_admin_id: string | null;
          created_at: string | null;
        };
      };
      admin_customer_notes: {
        Row: {
          id: number;
          organization_id: string;
          admin_user_id: string | null;
          content: string;
          created_at: string | null;
        };
      };
      ai_cost_events: {
        Row: {
          id: number;
          organization_id: string | null;
          proposal_id: string | null;
          template_id: string | null;
          model: string | null;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          cost_usd: number;
          metadata: unknown;
          created_at: string | null;
        };
      };
      user_profiles: {
        Row: {
          user_id: string;
          account_type: "nonprofit" | "freelancer";
          created_at: string | null;
          updated_at: string | null;
        };
      };
    };
  };
};
