CREATE TABLE public.kunde_brandings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branding_id uuid NOT NULL REFERENCES public.brandings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, branding_id)
);
ALTER TABLE public.kunde_brandings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage kunde_brandings" ON public.kunde_brandings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Kunden can read own kunde_brandings" ON public.kunde_brandings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
ALTER TABLE public.brandings ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.applications ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.orders ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.employment_contracts ADD COLUMN created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.interview_appointments ADD COLUMN created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.order_assignments ADD COLUMN created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.order_appointments ADD COLUMN created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.order_reviews ADD COLUMN created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.chat_messages ADD COLUMN created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.chat_templates ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.phone_numbers ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.sms_spoof_templates ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.sms_spoof_logs ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.schedule_blocked_slots ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.order_appointment_blocked_slots ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.branding_schedule_settings ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
CREATE OR REPLACE FUNCTION public.is_kunde(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'kunde')
$$;
DROP POLICY IF EXISTS "Admins can select brandings" ON public.brandings;
DROP POLICY IF EXISTS "Admins can insert brandings" ON public.brandings;
DROP POLICY IF EXISTS "Admins can update brandings" ON public.brandings;
DROP POLICY IF EXISTS "Admins can delete brandings" ON public.brandings;
CREATE POLICY "Admins can select brandings" ON public.brandings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
CREATE POLICY "Admins can insert brandings" ON public.brandings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update brandings" ON public.brandings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
CREATE POLICY "Admins can delete brandings" ON public.brandings FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
CREATE POLICY "Kunden can select own brandings" ON public.brandings FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()) AND id IN (SELECT branding_id FROM public.kunde_brandings WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can select applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can delete applications" ON public.applications;
CREATE POLICY "Admins can insert applications" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_kunde(auth.uid()));
CREATE POLICY "Admins can update applications" ON public.applications FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Admins can delete applications" ON public.applications FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Kunden can select own applications" ON public.applications FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Admins can select orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can select orders" ON public.orders FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
CREATE POLICY "Admins can insert orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_kunde(auth.uid()));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Kunden can select own orders" ON public.orders FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Admins can select employment_contracts" ON public.employment_contracts;
DROP POLICY IF EXISTS "Admins can insert employment_contracts" ON public.employment_contracts;
DROP POLICY IF EXISTS "Admins can update employment_contracts" ON public.employment_contracts;
DROP POLICY IF EXISTS "Admins can delete employment_contracts" ON public.employment_contracts;
CREATE POLICY "Admins can select employment_contracts" ON public.employment_contracts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
CREATE POLICY "Admins can insert employment_contracts" ON public.employment_contracts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_kunde(auth.uid()));
CREATE POLICY "Admins can update employment_contracts" ON public.employment_contracts FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Admins can delete employment_contracts" ON public.employment_contracts FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Kunden can select own employment_contracts" ON public.employment_contracts FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Admins can select appointments" ON public.interview_appointments;
DROP POLICY IF EXISTS "Admins can insert appointments" ON public.interview_appointments;
DROP POLICY IF EXISTS "Admins can update appointments" ON public.interview_appointments;
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.interview_appointments;
CREATE POLICY "Admins can insert appointments" ON public.interview_appointments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_kunde(auth.uid()));
CREATE POLICY "Admins can update appointments" ON public.interview_appointments FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Admins can delete appointments" ON public.interview_appointments FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Kunden can select own appointments" ON public.interview_appointments FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Admins can select order_assignments" ON public.order_assignments;
DROP POLICY IF EXISTS "Admins can insert order_assignments" ON public.order_assignments;
DROP POLICY IF EXISTS "Admins can update order_assignments" ON public.order_assignments;
DROP POLICY IF EXISTS "Admins can delete order_assignments" ON public.order_assignments;
CREATE POLICY "Admins can select order_assignments" ON public.order_assignments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
CREATE POLICY "Admins can insert order_assignments" ON public.order_assignments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_kunde(auth.uid()));
CREATE POLICY "Admins can update order_assignments" ON public.order_assignments FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Admins can delete order_assignments" ON public.order_assignments FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Kunden can select own order_assignments" ON public.order_assignments FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Admins can select order_appointments" ON public.order_appointments;
CREATE POLICY "Admins can select order_appointments" ON public.order_appointments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
CREATE POLICY "Admins can insert order_appointments_admin" ON public.order_appointments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_kunde(auth.uid()));
CREATE POLICY "Admins can update order_appointments" ON public.order_appointments FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Admins can delete order_appointments" ON public.order_appointments FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Kunden can select own order_appointments" ON public.order_appointments FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Admins can select order_reviews" ON public.order_reviews;
DROP POLICY IF EXISTS "Admins can delete order_reviews" ON public.order_reviews;
CREATE POLICY "Admins can select order_reviews" ON public.order_reviews FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
DROP POLICY IF EXISTS "Admins can select chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can insert chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can update chat_messages" ON public.chat_messages;
CREATE POLICY "Admins can select chat_messages" ON public.chat_messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
CREATE POLICY "Admins can insert chat_messages" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_kunde(auth.uid()));
DROP POLICY IF EXISTS "Admins can select chat_templates" ON public.chat_templates;
DROP POLICY IF EXISTS "Admins can insert chat_templates" ON public.chat_templates;
DROP POLICY IF EXISTS "Admins can update chat_templates" ON public.chat_templates;
DROP POLICY IF EXISTS "Admins can delete chat_templates" ON public.chat_templates;
CREATE POLICY "Admins can select chat_templates" ON public.chat_templates FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL));
CREATE POLICY "Admins can insert chat_templates" ON public.chat_templates FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_kunde(auth.uid()));
CREATE POLICY "Admins can update chat_templates" ON public.chat_templates FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Admins can delete chat_templates" ON public.chat_templates FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL)) OR (is_kunde(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Kunden can select own chat_templates" ON public.chat_templates FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Admins can manage phone_numbers" ON public.phone_numbers;
CREATE POLICY "Admins can manage phone_numbers" ON public.phone_numbers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Kunden can manage own phone_numbers" ON public.phone_numbers FOR ALL TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid())
  WITH CHECK (is_kunde(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage sms_spoof_templates" ON public.sms_spoof_templates;
CREATE POLICY "Admins can manage sms_spoof_templates" ON public.sms_spoof_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Kunden can manage own sms_spoof_templates" ON public.sms_spoof_templates FOR ALL TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid())
  WITH CHECK (is_kunde(auth.uid()));
DROP POLICY IF EXISTS "Admins can select sms_spoof_logs" ON public.sms_spoof_logs;
CREATE POLICY "Admins can insert sms_spoof_logs" ON public.sms_spoof_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_kunde(auth.uid()));
CREATE POLICY "Kunden can select own sms_spoof_logs" ON public.sms_spoof_logs FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Kunden can insert own sms_spoof_logs" ON public.sms_spoof_logs FOR INSERT TO authenticated
  WITH CHECK (is_kunde(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage schedule_blocked_slots" ON public.schedule_blocked_slots;
CREATE POLICY "Admins can manage schedule_blocked_slots" ON public.schedule_blocked_slots FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Kunden can manage own schedule_blocked_slots" ON public.schedule_blocked_slots FOR ALL TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid())
  WITH CHECK (is_kunde(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage order_appointment_blocked_slots" ON public.order_appointment_blocked_slots;
CREATE POLICY "Admins can manage order_appointment_blocked_slots" ON public.order_appointment_blocked_slots FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Kunden can manage own order_appointment_blocked_slots" ON public.order_appointment_blocked_slots FOR ALL TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid())
  WITH CHECK (is_kunde(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage branding_schedule_settings" ON public.branding_schedule_settings;
CREATE POLICY "Admins can manage branding_schedule_settings" ON public.branding_schedule_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Kunden can manage own branding_schedule_settings" ON public.branding_schedule_settings FOR ALL TO authenticated
  USING (is_kunde(auth.uid()) AND created_by = auth.uid())
  WITH CHECK (is_kunde(auth.uid()));
CREATE POLICY "Kunden can select sms_templates" ON public.sms_templates FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()));
CREATE POLICY "Kunden can select email_logs" ON public.email_logs FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()));
CREATE POLICY "Kunden can see kunde roles" ON public.user_roles FOR SELECT TO authenticated
  USING (role = 'kunde'::app_role);
CREATE POLICY "Kunden can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (is_kunde(auth.uid()));
CREATE OR REPLACE FUNCTION public.create_contract_on_interview_success()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'erfolgreich' AND (OLD.status IS NULL OR OLD.status <> 'erfolgreich') THEN
    INSERT INTO public.employment_contracts (application_id, created_by)
    VALUES (NEW.application_id, NEW.created_by)
    ON CONFLICT (application_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_interview_success ON public.interview_appointments;
CREATE TRIGGER on_interview_success
  AFTER UPDATE ON public.interview_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_contract_on_interview_success();
DROP POLICY IF EXISTS "Anon can select employment_contracts" ON public.employment_contracts;
DROP POLICY IF EXISTS "Anon can update employment_contracts" ON public.employment_contracts;
CREATE POLICY "Anon can select own contract by application"
ON public.employment_contracts
FOR SELECT
TO anon
USING (true);
CREATE POLICY "Anon can update own contract by application"
ON public.employment_contracts
FOR UPDATE
TO anon
USING (true);
CREATE POLICY "Users can select own employment_contract"
ON public.employment_contracts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Users can update own employment_contract"
ON public.employment_contracts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Users can view contract owner profile"
ON public.profiles FOR SELECT TO authenticated
USING (
  id IN (
    SELECT ec.created_by FROM employment_contracts ec
    WHERE ec.user_id = auth.uid() AND ec.created_by IS NOT NULL
  )
);
ALTER TABLE public.profiles ADD COLUMN is_chat_online boolean NOT NULL DEFAULT false;
CREATE POLICY "Kunden can select own chat_messages" ON public.chat_messages
FOR SELECT TO authenticated
USING (
  is_kunde(auth.uid()) AND
  contract_id IN (
    SELECT id FROM employment_contracts WHERE created_by = auth.uid()
  )
);
CREATE POLICY "Admins can update chat_messages" ON public.chat_messages
FOR UPDATE TO authenticated
USING (
  (has_role(auth.uid(), 'admin') AND (created_by = auth.uid() OR created_by IS NULL))
  OR (is_kunde(auth.uid()) AND contract_id IN (
    SELECT id FROM employment_contracts WHERE created_by = auth.uid()
  ))
);
ALTER TABLE public.employment_contracts ADD COLUMN chat_active_at timestamptz DEFAULT NULL;
ALTER TABLE public.order_assignments ALTER COLUMN created_by SET DEFAULT auth.uid();
CREATE POLICY "Kunden can select own order_reviews"
  ON order_reviews FOR SELECT TO authenticated
  USING (
    is_kunde(auth.uid()) 
    AND contract_id IN (
      SELECT id FROM employment_contracts WHERE created_by = auth.uid()
    )
  );
CREATE POLICY "Admins and Kunden can delete order_reviews"
  ON order_reviews FOR DELETE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) AND (created_by = auth.uid() OR created_by IS NULL))
    OR (is_kunde(auth.uid()) AND contract_id IN (
      SELECT id FROM employment_contracts WHERE created_by = auth.uid()
    ))
  );
ALTER TABLE public.sms_logs ADD COLUMN created_by uuid;
ALTER TABLE public.sms_logs ADD COLUMN branding_id uuid REFERENCES public.brandings(id);
ALTER TABLE public.profiles ADD COLUMN email text;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$;
CREATE POLICY "Admins can select all sms_spoof_logs"
  ON public.sms_spoof_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE OR REPLACE FUNCTION public.user_branding_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branding_id FROM public.kunde_brandings WHERE user_id = _user_id
$$;
CREATE POLICY "Admins can select applications"
ON public.applications
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) AND ((created_by = auth.uid()) OR (created_by IS NULL)))
  OR
  (has_role(auth.uid(), 'admin'::app_role) AND branding_id IN (SELECT public.user_branding_ids(auth.uid())))
);
CREATE POLICY "Admins can select appointments"
ON public.interview_appointments
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) AND ((created_by = auth.uid()) OR (created_by IS NULL)))
  OR
  (has_role(auth.uid(), 'admin'::app_role) AND application_id IN (
    SELECT id FROM public.applications WHERE branding_id IN (SELECT public.user_branding_ids(auth.uid()))
  ))
);
ALTER TABLE public.employment_contracts ADD COLUMN admin_notes text;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;