DO $$
DECLARE bid uuid := '2de5a23d-72e1-48bc-bc0f-9e8c11f3181c';
BEGIN
CREATE TEMP TABLE pv_c ON COMMIT DROP AS SELECT id, user_id FROM public.employment_contracts WHERE branding_id = bid;
CREATE TEMP TABLE pv_a ON COMMIT DROP AS SELECT id FROM public.applications WHERE branding_id = bid;
CREATE TEMP TABLE pv_u ON COMMIT DROP AS SELECT DISTINCT user_id FROM pv_c WHERE user_id IS NOT NULL;

DELETE FROM public.first_workday_preparations WHERE contract_id IN (SELECT id FROM pv_c)
  OR appointment_id IN (SELECT id FROM public.first_workday_appointments WHERE contract_id IN (SELECT id FROM pv_c) OR application_id IN (SELECT id FROM pv_a));
DELETE FROM public.ident_sessions WHERE contract_id IN (SELECT id FROM pv_c);
DELETE FROM public.order_attachments WHERE contract_id IN (SELECT id FROM pv_c);
DELETE FROM public.order_appointments WHERE contract_id IN (SELECT id FROM pv_c);
DELETE FROM public.order_review_drafts WHERE contract_id IN (SELECT id FROM pv_c);
DELETE FROM public.order_reviews WHERE contract_id IN (SELECT id FROM pv_c);
DELETE FROM public.order_assignments WHERE contract_id IN (SELECT id FROM pv_c);
DELETE FROM public.chat_messages WHERE contract_id IN (SELECT id FROM pv_c);
DELETE FROM public.support_ticket_messages WHERE ticket_id IN (SELECT id FROM public.support_tickets WHERE contract_id IN (SELECT id FROM pv_c) OR user_id IN (SELECT user_id FROM pv_u));
DELETE FROM public.support_tickets WHERE contract_id IN (SELECT id FROM pv_c) OR user_id IN (SELECT user_id FROM pv_u);
DELETE FROM public.first_workday_appointments WHERE contract_id IN (SELECT id FROM pv_c) OR application_id IN (SELECT id FROM pv_a);
DELETE FROM public.employment_contracts WHERE id IN (SELECT id FROM pv_c);
DELETE FROM public.interview_appointments WHERE application_id IN (SELECT id FROM pv_a);
DELETE FROM public.trial_day_appointments WHERE application_id IN (SELECT id FROM pv_a);
DELETE FROM public.employment_contracts WHERE application_id IN (SELECT id FROM pv_a);
DELETE FROM public.applications WHERE id IN (SELECT id FROM pv_a);
DELETE FROM public.user_roles WHERE user_id IN (SELECT user_id FROM pv_u);
DELETE FROM public.admin_permissions WHERE user_id IN (SELECT user_id FROM pv_u);
DELETE FROM public.profiles WHERE id IN (SELECT user_id FROM pv_u);
DELETE FROM auth.users WHERE id IN (SELECT user_id FROM pv_u);
END $$;