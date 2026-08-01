ALTER TABLE public.branding_schedule_settings
  ADD COLUMN IF NOT EXISTS slot_index integer NOT NULL DEFAULT 1;

ALTER TABLE public.schedule_blocked_slots
  ADD COLUMN IF NOT EXISTS slot_index integer;

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.branding_schedule_settings'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.branding_schedule_settings DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.branding_schedule_settings_branding_id_schedule_type_idx;
DROP INDEX IF EXISTS public.branding_schedule_settings_branding_schedule_unique;

CREATE UNIQUE INDEX IF NOT EXISTS branding_schedule_settings_branding_type_slot_unique
  ON public.branding_schedule_settings (branding_id, schedule_type, slot_index);

ALTER TABLE public.branding_schedule_settings
  ADD CONSTRAINT branding_schedule_settings_branding_type_slot_key
  UNIQUE USING INDEX branding_schedule_settings_branding_type_slot_unique;