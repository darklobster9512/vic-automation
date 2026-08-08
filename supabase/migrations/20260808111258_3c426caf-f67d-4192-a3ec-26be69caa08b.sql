CREATE TABLE public.distribution_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branding_id uuid NOT NULL REFERENCES public.brandings(id) ON DELETE CASCADE,
  hours integer NOT NULL,
  orders_per_day integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branding_id, hours)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribution_targets TO authenticated;
GRANT ALL ON public.distribution_targets TO service_role;

ALTER TABLE public.distribution_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage distribution targets"
ON public.distribution_targets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Kunden manage own branding targets"
ON public.distribution_targets FOR ALL TO authenticated
USING (branding_id IN (SELECT public.user_branding_ids(auth.uid())))
WITH CHECK (branding_id IN (SELECT public.user_branding_ids(auth.uid())));

CREATE TRIGGER distribution_targets_updated_at
BEFORE UPDATE ON public.distribution_targets
FOR EACH ROW EXECUTE FUNCTION public.email_queue_set_updated_at();