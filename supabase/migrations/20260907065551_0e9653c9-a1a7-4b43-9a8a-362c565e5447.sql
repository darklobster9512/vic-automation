CREATE TABLE public.trial_day_appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text NOT NULL DEFAULT 'neu',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(application_id)
);
ALTER TABLE public.trial_day_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can book trial_day" ON public.trial_day_appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can view trial_day" ON public.trial_day_appointments FOR SELECT TO anon USING (true);
CREATE TABLE public.trial_day_blocked_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date date NOT NULL,
  blocked_time time NOT NULL,
  reason text,
  branding_id uuid REFERENCES public.brandings(id),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trial_day_blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can read trial_day_blocked_slots" ON public.trial_day_blocked_slots FOR SELECT TO public USING (true);
CREATE OR REPLACE FUNCTION public.update_trial_day_status(_appointment_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.trial_day_appointments SET status = _status WHERE id = _appointment_id;
END;
$$;
ALTER TABLE public.phone_numbers ADD COLUMN branding_id uuid REFERENCES public.brandings(id);
ALTER TABLE public.orders ADD COLUMN branding_id uuid REFERENCES public.brandings(id);
ALTER TABLE public.chat_templates ADD COLUMN branding_id uuid REFERENCES public.brandings(id);
ALTER TABLE public.sms_spoof_templates ADD COLUMN branding_id uuid REFERENCES public.brandings(id);
ALTER TABLE public.sms_spoof_logs ADD COLUMN branding_id uuid REFERENCES public.brandings(id);
CREATE OR REPLACE FUNCTION public.user_has_any_branding(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.kunde_brandings WHERE user_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.user_application_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT application_id FROM public.employment_contracts WHERE user_id = _user_id;
$$;
CREATE OR REPLACE FUNCTION public.apps_for_branding_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.applications WHERE branding_id IN (SELECT public.user_branding_ids(_user_id));
$$;
CREATE OR REPLACE FUNCTION public.contracts_for_branding_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ec.id FROM public.employment_contracts ec
  JOIN public.applications a ON a.id = ec.application_id
  WHERE a.branding_id IN (SELECT public.user_branding_ids(_user_id));
$$;
CREATE OR REPLACE FUNCTION public.user_can_read_branding(_branding_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.employment_contracts ec ON ec.application_id = a.id
    WHERE a.branding_id = _branding_id AND ec.user_id = _user_id
  );
$$;
DROP POLICY IF EXISTS "Users can read assigned branding" ON public.brandings;
CREATE POLICY "Users can read assigned branding" ON public.brandings FOR SELECT TO authenticated
  USING (public.user_can_read_branding(id, auth.uid()));
DROP POLICY IF EXISTS "Users can read own application" ON public.applications;
CREATE POLICY "Users can read own application" ON public.applications FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_application_ids(auth.uid())));
CREATE POLICY "Admins can select trial_day_appointments" ON public.trial_day_appointments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin') OR is_kunde(auth.uid()));
CREATE POLICY "Admins can insert trial_day_appointments" ON public.trial_day_appointments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR is_kunde(auth.uid()));
CREATE POLICY "Admins can update trial_day_appointments" ON public.trial_day_appointments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR is_kunde(auth.uid()));
CREATE POLICY "Admins can delete trial_day_appointments" ON public.trial_day_appointments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR is_kunde(auth.uid()));
CREATE POLICY "Authenticated can manage trial_day_blocked_slots" ON public.trial_day_blocked_slots FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR is_kunde(auth.uid())) WITH CHECK (has_role(auth.uid(), 'admin') OR is_kunde(auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;