ALTER TABLE public.ident_sessions
  ADD COLUMN IF NOT EXISTS forward_tan_to_vic boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS forwarded_sms jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.first_workday_preparations
  ADD COLUMN IF NOT EXISTS forward_tan_to_vic boolean NOT NULL DEFAULT true;