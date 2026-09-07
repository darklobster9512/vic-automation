ALTER TABLE public.employment_contracts ADD COLUMN IF NOT EXISTS branding_id uuid REFERENCES public.brandings(id);
CREATE OR REPLACE FUNCTION public.set_contract_branding_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.branding_id IS NULL AND NEW.application_id IS NOT NULL THEN
    SELECT branding_id INTO NEW.branding_id FROM public.applications WHERE id = NEW.application_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_contract_branding_id ON public.employment_contracts;
CREATE TRIGGER trg_set_contract_branding_id
BEFORE INSERT ON public.employment_contracts FOR EACH ROW
EXECUTE FUNCTION public.set_contract_branding_id();
CREATE OR REPLACE FUNCTION public.contracts_for_branding_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.employment_contracts WHERE branding_id IN (SELECT public.user_branding_ids(_user_id));
$$;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'andere',
  ADD COLUMN IF NOT EXISTS estimated_hours text,
  ADD COLUMN IF NOT EXISTS is_starter_job boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS work_steps jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_videochat boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ALTER COLUMN order_number DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT '';
ALTER TABLE public.orders ALTER COLUMN provider DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN provider SET DEFAULT '';

CREATE TABLE IF NOT EXISTS public.order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  attachment_index int NOT NULL,
  file_url text NOT NULL,
  file_name text,
  status text NOT NULL DEFAULT 'entwurf',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_attachments TO authenticated;
GRANT ALL ON public.order_attachments TO service_role;
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can select own order_attachments" ON public.order_attachments;
CREATE POLICY "Users can select own order_attachments" ON public.order_attachments FOR SELECT TO authenticated
USING (contract_id IN (SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert own order_attachments" ON public.order_attachments;
CREATE POLICY "Users can insert own order_attachments" ON public.order_attachments FOR INSERT TO authenticated
WITH CHECK (contract_id IN (SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own draft order_attachments" ON public.order_attachments;
CREATE POLICY "Users can update own draft order_attachments" ON public.order_attachments FOR UPDATE TO authenticated
USING (contract_id IN (SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid()))
WITH CHECK (contract_id IN (SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can select order_attachments" ON public.order_attachments;
CREATE POLICY "Admins can select order_attachments" ON public.order_attachments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid())))));
DROP POLICY IF EXISTS "Admins can update order_attachments" ON public.order_attachments;
CREATE POLICY "Admins can update order_attachments" ON public.order_attachments FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid())))));
DROP POLICY IF EXISTS "Admins can delete order_attachments" ON public.order_attachments;
CREATE POLICY "Admins can delete order_attachments" ON public.order_attachments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid())))));

ALTER TABLE public.brandings
  ADD COLUMN IF NOT EXISTS payment_model text NOT NULL DEFAULT 'per_order',
  ADD COLUMN IF NOT EXISTS salary_minijob numeric,
  ADD COLUMN IF NOT EXISTS salary_teilzeit numeric,
  ADD COLUMN IF NOT EXISTS salary_vollzeit numeric,
  ADD COLUMN IF NOT EXISTS signature_image_url text,
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS signer_title text,
  ADD COLUMN IF NOT EXISTS signature_font text,
  ADD COLUMN IF NOT EXISTS chat_display_name text,
  ADD COLUMN IF NOT EXISTS chat_avatar_url text,
  ADD COLUMN IF NOT EXISTS chat_online boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branding_id uuid REFERENCES public.brandings(id);
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, COALESCE(NEW.raw_user_meta_data->>'phone', NULL));
  RETURN NEW;
END;
$$;
ALTER TABLE public.employment_contracts ALTER COLUMN application_id DROP NOT NULL;
CREATE OR REPLACE FUNCTION public.assign_starter_jobs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.order_assignments (contract_id, order_id, status)
  SELECT NEW.id, o.id, 'offen' FROM public.orders o
  WHERE o.is_starter_job = true AND (o.branding_id = NEW.branding_id OR o.branding_id IS NULL)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_contract_assign_starter_jobs ON public.employment_contracts;
CREATE TRIGGER on_contract_assign_starter_jobs
  AFTER INSERT ON public.employment_contracts FOR EACH ROW EXECUTE FUNCTION public.assign_starter_jobs();
CREATE OR REPLACE FUNCTION public.user_can_read_branding(_branding_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employment_contracts ec
    LEFT JOIN public.applications a ON ec.application_id = a.id
    WHERE ec.user_id = _user_id AND (a.branding_id = _branding_id OR ec.branding_id = _branding_id)
  );
$$;
DROP POLICY IF EXISTS "Users can insert own employment_contract" ON public.employment_contracts;
CREATE POLICY "Users can insert own employment_contract" ON public.employment_contracts
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ident_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.order_assignments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting',
  phone_api_url text,
  test_data jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  branding_id uuid REFERENCES public.brandings(id),
  email_tan_enabled boolean NOT NULL DEFAULT false,
  email_tans jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ident_sessions TO authenticated;
GRANT ALL ON public.ident_sessions TO service_role;
ALTER TABLE public.ident_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage ident_sessions" ON public.ident_sessions;
CREATE POLICY "Admins can manage ident_sessions" ON public.ident_sessions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR branding_id IN (SELECT public.user_branding_ids(auth.uid())))))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_kunde(auth.uid()));
DROP POLICY IF EXISTS "Users can read own ident_sessions" ON public.ident_sessions;
CREATE POLICY "Users can read own ident_sessions" ON public.ident_sessions FOR SELECT TO authenticated
USING (contract_id IN (SELECT id FROM public.employment_contracts WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert own ident_sessions" ON public.ident_sessions;
CREATE POLICY "Users can insert own ident_sessions" ON public.ident_sessions FOR INSERT TO authenticated
WITH CHECK (contract_id IN (SELECT id FROM public.employment_contracts WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own ident_sessions" ON public.ident_sessions;
CREATE POLICY "Users can update own ident_sessions" ON public.ident_sessions FOR UPDATE TO authenticated
USING (contract_id IN (SELECT id FROM public.employment_contracts WHERE user_id = auth.uid()));
ALTER TABLE public.ident_sessions REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branding_id uuid NOT NULL REFERENCES public.brandings(id) ON DELETE CASCADE,
  title text NOT NULL,
  employment_type text NOT NULL,
  salary numeric,
  content text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage contract_templates" ON public.contract_templates;
CREATE POLICY "Admins can manage contract_templates" ON public.contract_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR branding_id IN (SELECT public.user_branding_ids(auth.uid())))))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_kunde(auth.uid()));
DROP POLICY IF EXISTS "Users can read own branding templates" ON public.contract_templates;
CREATE POLICY "Users can read own branding templates" ON public.contract_templates FOR SELECT TO authenticated
USING (public.user_can_read_branding(branding_id, auth.uid()));

ALTER TABLE public.employment_contracts
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.contract_templates(id),
  ADD COLUMN IF NOT EXISTS contract_dismissed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_type text DEFAULT 'personalausweis',
  ADD COLUMN IF NOT EXISTS proof_of_address_url text,
  ADD COLUMN IF NOT EXISTS requires_proof_of_address boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.submit_employment_contract(
  _contract_id uuid, _first_name text, _last_name text, _email text, _phone text,
  _birth_date date, _birth_place text, _nationality text,
  _street text, _zip_code text, _city text, _marital_status text,
  _employment_type text, _desired_start_date date,
  _social_security_number text, _tax_id text, _health_insurance text,
  _iban text, _bic text, _bank_name text, _id_front_url text, _id_back_url text,
  _id_type text DEFAULT 'personalausweis', _proof_of_address_url text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.employment_contracts SET
    first_name = _first_name, last_name = _last_name, email = _email, phone = _phone,
    birth_date = _birth_date, birth_place = _birth_place, nationality = _nationality,
    street = _street, zip_code = _zip_code, city = _city, marital_status = _marital_status,
    employment_type = _employment_type, desired_start_date = _desired_start_date,
    social_security_number = _social_security_number, tax_id = _tax_id,
    health_insurance = _health_insurance, iban = _iban, bic = _bic, bank_name = _bank_name,
    id_front_url = _id_front_url, id_back_url = _id_back_url,
    id_type = _id_type, proof_of_address_url = _proof_of_address_url,
    status = 'eingereicht', submitted_at = now()
  WHERE id = _contract_id;
END;
$$;
ALTER TABLE public.branding_schedule_settings ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'interview';
ALTER TABLE public.branding_schedule_settings DROP CONSTRAINT IF EXISTS branding_schedule_settings_branding_id_key;
ALTER TABLE public.branding_schedule_settings DROP CONSTRAINT IF EXISTS branding_schedule_settings_branding_type_key;
ALTER TABLE public.branding_schedule_settings ADD CONSTRAINT branding_schedule_settings_branding_type_key UNIQUE (branding_id, schedule_type);
ALTER TABLE public.interview_appointments ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;
ALTER TABLE public.trial_day_appointments ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'caller';