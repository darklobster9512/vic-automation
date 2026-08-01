ALTER TABLE public.branding_schedule_settings
  ADD COLUMN IF NOT EXISTS lunch_break_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lunch_break_start time without time zone,
  ADD COLUMN IF NOT EXISTS lunch_break_end time without time zone;