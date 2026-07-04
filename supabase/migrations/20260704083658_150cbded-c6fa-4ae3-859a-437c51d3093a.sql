ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'anosim',
  ADD COLUMN IF NOT EXISTS rental_id text,
  ADD COLUMN IF NOT EXISTS label text;

ALTER TABLE public.phone_numbers
  ALTER COLUMN api_url DROP NOT NULL;

ALTER TABLE public.phone_numbers
  DROP CONSTRAINT IF EXISTS phone_numbers_provider_check;
ALTER TABLE public.phone_numbers
  ADD CONSTRAINT phone_numbers_provider_check CHECK (provider IN ('anosim','smsbot'));