GRANT SELECT ON public.branding_schedule_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_schedule_settings TO authenticated;
GRANT ALL ON public.branding_schedule_settings TO service_role;
ALTER TABLE public.branding_schedule_settings DROP CONSTRAINT IF EXISTS branding_schedule_settings_branding_type_key;
DROP INDEX IF EXISTS public.branding_schedule_settings_branding_type_key;
GRANT SELECT ON public.schedule_blocked_slots, public.trial_day_blocked_slots, public.first_workday_blocked_slots, public.order_appointment_blocked_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_blocked_slots, public.trial_day_blocked_slots, public.first_workday_blocked_slots, public.order_appointment_blocked_slots TO authenticated;
GRANT ALL ON public.schedule_blocked_slots, public.trial_day_blocked_slots, public.first_workday_blocked_slots, public.order_appointment_blocked_slots TO service_role;