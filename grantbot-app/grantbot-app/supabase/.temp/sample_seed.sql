insert into public.support_tickets (organization_id, subject, status, priority, opened_by)
select id, 'Workspace AI summary missing', 'open', 'high', '00000000-0000-0000-0000-000000000001'
from public.organizations
limit 1;

insert into public.support_ticket_events (ticket_id, event_type, message, actor_admin_id)
select id, 'status.open', 'Ticket created for missing AI summary', '00000000-0000-0000-0000-000000000001'
from public.support_tickets
order by created_at desc
limit 1;

insert into public.ai_cost_events (organization_id, proposal_id, template_id, model, prompt_tokens, completion_tokens, total_tokens, cost_usd)
select id, null, 'grant-intro', 'gpt-4o-mini', 1200, 800, 2000, 4.20
from public.organizations
limit 1;
