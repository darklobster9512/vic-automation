ALTER TABLE public.brandings
  ADD COLUMN IF NOT EXISTS smsbot_api_key text,
  ADD COLUMN IF NOT EXISTS smsbot_rental_id text;