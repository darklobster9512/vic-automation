ALTER TABLE public.branding_schedule_settings
  ADD COLUMN IF NOT EXISTS day_time_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;