CREATE TABLE public.first_workday_preparations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.first_workday_appointments(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  branding_id uuid REFERENCES public.brandings(id) ON DELETE SET NULL,
  phone_api_url text,
  test_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  info_notes text,
  status text NOT NULL DEFAULT 'prepared',
  started_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.first_workday_preparations TO authenticated;
GRANT ALL ON public.first_workday_preparations TO service_role;

ALTER TABLE public.first_workday_preparations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage first workday preparations"
ON public.first_workday_preparations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Kunden manage own branding preparations"
ON public.first_workday_preparations FOR ALL TO authenticated
USING (branding_id IN (SELECT public.user_branding_ids(auth.uid())))
WITH CHECK (branding_id IN (SELECT public.user_branding_ids(auth.uid())));

CREATE TRIGGER first_workday_preparations_updated_at
BEFORE UPDATE ON public.first_workday_preparations
FOR EACH ROW EXECUTE FUNCTION public.email_queue_set_updated_at();