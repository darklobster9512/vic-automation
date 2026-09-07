-- Block c07 replay (idempotent, DDL only)

CREATE OR REPLACE FUNCTION public.is_caller(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'caller')
$$;

CREATE TABLE IF NOT EXISTS public.first_workday_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time without time zone NOT NULL,
  status text NOT NULL DEFAULT 'neu',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reminder_sent boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.first_workday_appointments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.first_workday_appointments TO authenticated;
GRANT ALL ON public.first_workday_appointments TO service_role;
ALTER TABLE public.first_workday_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select first_workday_appointments" ON public.first_workday_appointments;
CREATE POLICY "Admins can select first_workday_appointments" ON public.first_workday_appointments FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR application_id IN (SELECT public.apps_for_branding_ids(auth.uid())) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid()))))
  OR (public.is_caller(auth.uid()) AND (application_id IN (SELECT public.apps_for_branding_ids(auth.uid())) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid()))))
);
DROP POLICY IF EXISTS "Admins can insert first_workday_appointments" ON public.first_workday_appointments;
CREATE POLICY "Admins can insert first_workday_appointments" ON public.first_workday_appointments FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.is_kunde(auth.uid()) OR public.is_caller(auth.uid())
);
DROP POLICY IF EXISTS "Admins can update first_workday_appointments" ON public.first_workday_appointments;
CREATE POLICY "Admins can update first_workday_appointments" ON public.first_workday_appointments FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR application_id IN (SELECT public.apps_for_branding_ids(auth.uid())) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid()))))
  OR (public.is_caller(auth.uid()) AND (application_id IN (SELECT public.apps_for_branding_ids(auth.uid())) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid()))))
);
DROP POLICY IF EXISTS "Admins can delete first_workday_appointments" ON public.first_workday_appointments;
CREATE POLICY "Admins can delete first_workday_appointments" ON public.first_workday_appointments FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR application_id IN (SELECT public.apps_for_branding_ids(auth.uid())) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid()))))
  OR (public.is_caller(auth.uid()) AND (application_id IN (SELECT public.apps_for_branding_ids(auth.uid())) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid()))))
);
DROP POLICY IF EXISTS "Anon can read first_workday by contract_id" ON public.first_workday_appointments;
CREATE POLICY "Anon can read first_workday by contract_id" ON public.first_workday_appointments FOR SELECT TO anon USING (contract_id IS NOT NULL);
DROP POLICY IF EXISTS "Anon can book first_workday by contract_id" ON public.first_workday_appointments;
CREATE POLICY "Anon can book first_workday by contract_id" ON public.first_workday_appointments FOR INSERT TO anon WITH CHECK (contract_id IS NOT NULL);
DROP POLICY IF EXISTS "Users can read own first_workday by contract_id" ON public.first_workday_appointments;
CREATE POLICY "Users can read own first_workday by contract_id" ON public.first_workday_appointments FOR SELECT TO authenticated USING (contract_id IN (SELECT id FROM public.employment_contracts WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Authenticated can insert first_workday by contract_id" ON public.first_workday_appointments;
CREATE POLICY "Authenticated can insert first_workday by contract_id" ON public.first_workday_appointments FOR INSERT TO authenticated WITH CHECK (contract_id IN (SELECT id FROM public.employment_contracts WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.first_workday_blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL,
  blocked_time time without time zone NOT NULL,
  branding_id uuid REFERENCES public.brandings(id),
  reason text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.first_workday_blocked_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.first_workday_blocked_slots TO authenticated;
GRANT ALL ON public.first_workday_blocked_slots TO service_role;
ALTER TABLE public.first_workday_blocked_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can read first_workday_blocked_slots" ON public.first_workday_blocked_slots;
CREATE POLICY "Anon can read first_workday_blocked_slots" ON public.first_workday_blocked_slots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can manage first_workday_blocked_slots" ON public.first_workday_blocked_slots;
CREATE POLICY "Authenticated can manage first_workday_blocked_slots" ON public.first_workday_blocked_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR branding_id IN (SELECT public.user_branding_ids(auth.uid())))) OR (public.is_caller(auth.uid()) AND branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_kunde(auth.uid()) OR public.is_caller(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_first_workday_status(_appointment_id uuid, _status text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.first_workday_appointments SET status = _status WHERE id = _appointment_id;
END; $$;

ALTER TABLE public.brandings
  ADD COLUMN IF NOT EXISTS estimated_salary_minijob numeric,
  ADD COLUMN IF NOT EXISTS estimated_salary_teilzeit numeric,
  ADD COLUMN IF NOT EXISTS estimated_salary_vollzeit numeric,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS spoof_credits integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS project_manager_name text,
  ADD COLUMN IF NOT EXISTS project_manager_title text,
  ADD COLUMN IF NOT EXISTS project_manager_image_url text,
  ADD COLUMN IF NOT EXISTS recruiter_name text,
  ADD COLUMN IF NOT EXISTS recruiter_title text,
  ADD COLUMN IF NOT EXISTS recruiter_image_url text;

CREATE TABLE IF NOT EXISTS public.branding_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branding_id uuid NOT NULL REFERENCES public.brandings(id) ON DELETE CASCADE,
  page_context text NOT NULL,
  content text NOT NULL,
  author_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_notes TO authenticated;
GRANT ALL ON public.branding_notes TO service_role;
ALTER TABLE public.branding_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read branding_notes" ON public.branding_notes;
CREATE POLICY "Users can read branding_notes" ON public.branding_notes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
  OR (public.is_caller(auth.uid()) AND branding_id IN (SELECT public.user_branding_ids(auth.uid())))
);
DROP POLICY IF EXISTS "Users can insert branding_notes" ON public.branding_notes;
CREATE POLICY "Users can insert branding_notes" ON public.branding_notes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.is_kunde(auth.uid()) OR public.is_caller(auth.uid())
);
DROP POLICY IF EXISTS "Users can delete branding_notes" ON public.branding_notes;
CREATE POLICY "Users can delete branding_notes" ON public.branding_notes FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
  OR (public.is_caller(auth.uid()) AND branding_id IN (SELECT public.user_branding_ids(auth.uid())))
);

CREATE OR REPLACE FUNCTION public.decrement_spoof_credits(_branding_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.brandings SET spoof_credits = spoof_credits - 1
  WHERE id = _branding_id AND spoof_credits IS NOT NULL;
END; $$;

ALTER TABLE public.interview_appointments
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_timestamps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS probetag_invite_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS probetag_invite_timestamps jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS notification_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_timestamps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_meta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;
ALTER TABLE public.trial_day_appointments
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_timestamps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS success_notification_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_notification_timestamps jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE public.ident_sessions ADD COLUMN IF NOT EXISTS info_notes text DEFAULT '';
ALTER TABLE public.sms_spoof_logs ADD COLUMN IF NOT EXISTS source text DEFAULT 'auto';

DROP POLICY IF EXISTS "Anon can delete own appointment for rebooking" ON public.interview_appointments;
CREATE POLICY "Anon can delete own appointment for rebooking" ON public.interview_appointments FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "Anon can delete own trial appointment for rebooking" ON public.trial_day_appointments;
CREATE POLICY "Anon can delete own trial appointment for rebooking" ON public.trial_day_appointments FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "Kunden can select own branding sms_logs" ON public.sms_logs;
CREATE POLICY "Kunden can select own branding sms_logs" ON public.sms_logs FOR SELECT TO authenticated USING (public.is_kunde(auth.uid()) AND branding_id IN (SELECT public.user_branding_ids(auth.uid())));
DROP POLICY IF EXISTS "Kunden can select own branding sms_spoof_logs" ON public.sms_spoof_logs;
CREATE POLICY "Kunden can select own branding sms_spoof_logs" ON public.sms_spoof_logs FOR SELECT TO authenticated USING (public.is_kunde(auth.uid()) AND branding_id IN (SELECT public.user_branding_ids(auth.uid())));
DROP POLICY IF EXISTS "Admin and kunde can update sms_logs" ON public.sms_logs;
CREATE POLICY "Admin and kunde can update sms_logs" ON public.sms_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_kunde(auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_kunde(auth.uid()));
DROP POLICY IF EXISTS "Admins can select employment_contracts" ON public.employment_contracts;
CREATE POLICY "Admins can select employment_contracts" ON public.employment_contracts FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
  OR (public.is_kunde(auth.uid()) AND (NOT public.user_has_any_branding(auth.uid()) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
  OR (public.is_caller(auth.uid()) AND branding_id IN (SELECT public.user_branding_ids(auth.uid())))
  OR user_id IS NULL
);

CREATE OR REPLACE FUNCTION public.book_first_workday_public(
  _contract_id uuid, _appointment_date date, _appointment_time time, _phone text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.employment_contracts WHERE id = _contract_id) THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;
  DELETE FROM public.first_workday_appointments WHERE contract_id = _contract_id;
  INSERT INTO public.first_workday_appointments (contract_id, application_id, appointment_date, appointment_time, created_by)
  SELECT _contract_id, ec.application_id, _appointment_date, _appointment_time, ec.created_by
  FROM public.employment_contracts ec WHERE ec.id = _contract_id
  RETURNING id INTO new_id;
  IF _phone IS NOT NULL AND _phone <> '' THEN
    UPDATE public.employment_contracts SET phone = _phone WHERE id = _contract_id;
  END IF;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.book_first_workday_public(uuid, date, time, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_contract_phone_public(_contract_id uuid, _phone text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.employment_contracts SET phone = _phone WHERE id = _contract_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.update_contract_phone_public(uuid, text) TO anon, authenticated;

ALTER TABLE public.ident_sessions ALTER COLUMN assignment_id DROP NOT NULL;
ALTER TABLE public.ident_sessions ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.ident_sessions DROP CONSTRAINT IF EXISTS ident_sessions_assignment_id_fkey;
ALTER TABLE public.ident_sessions ADD CONSTRAINT ident_sessions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.order_assignments(id) ON DELETE SET NULL;
ALTER TABLE public.ident_sessions DROP CONSTRAINT IF EXISTS ident_sessions_order_id_fkey;
ALTER TABLE public.ident_sessions ADD CONSTRAINT ident_sessions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.normalize_email_lowercase()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN NEW.email := lower(trim(NEW.email)); END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_normalize_email_employment_contracts ON public.employment_contracts;
CREATE TRIGGER trg_normalize_email_employment_contracts BEFORE INSERT OR UPDATE ON public.employment_contracts FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();
DROP TRIGGER IF EXISTS trg_normalize_email_applications ON public.applications;
CREATE TRIGGER trg_normalize_email_applications BEFORE INSERT OR UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();
DROP TRIGGER IF EXISTS trg_normalize_email_profiles ON public.profiles;
CREATE TRIGGER trg_normalize_email_profiles BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();