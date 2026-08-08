CREATE TABLE public.sms_inbox_seen (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  source_key text NOT NULL,
  message_hash text NOT NULL,
  phone_number text,
  branding_id uuid REFERENCES public.brandings(id) ON DELETE SET NULL,
  received_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sms_inbox_seen_unique UNIQUE (provider, source_key, message_hash)
);

GRANT ALL ON public.sms_inbox_seen TO service_role;

ALTER TABLE public.sms_inbox_seen ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sms_inbox_seen_created_at ON public.sms_inbox_seen (created_at DESC);