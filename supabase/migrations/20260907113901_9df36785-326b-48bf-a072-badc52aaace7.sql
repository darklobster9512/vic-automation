-- Helper predicate inline: is_kunde + branding scope

-- applications
CREATE POLICY "Kunden can select applications" ON public.applications
FOR SELECT TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

CREATE POLICY "Kunden can update applications" ON public.applications
FOR UPDATE TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

-- employment_contracts
CREATE POLICY "Kunden can select employment_contracts" ON public.employment_contracts
FOR SELECT TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

CREATE POLICY "Kunden can update employment_contracts" ON public.employment_contracts
FOR UPDATE TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

-- interview_appointments (no branding_id -> via applications)
CREATE POLICY "Kunden can select interview_appointments" ON public.interview_appointments
FOR SELECT TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR application_id IN (SELECT public.apps_for_branding_ids(auth.uid()))));

CREATE POLICY "Kunden can update interview_appointments" ON public.interview_appointments
FOR UPDATE TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR application_id IN (SELECT public.apps_for_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR application_id IN (SELECT public.apps_for_branding_ids(auth.uid()))));

-- contract_templates
CREATE POLICY "Kunden can manage contract_templates" ON public.contract_templates
FOR ALL TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

-- branding_schedule_settings
CREATE POLICY "Kunden can manage branding_schedule_settings" ON public.branding_schedule_settings
FOR ALL TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

-- blocked slots tables
CREATE POLICY "Kunden can manage schedule_blocked_slots" ON public.schedule_blocked_slots
FOR ALL TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

CREATE POLICY "Kunden can manage trial_day_blocked_slots" ON public.trial_day_blocked_slots
FOR ALL TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

CREATE POLICY "Kunden can manage first_workday_blocked_slots" ON public.first_workday_blocked_slots
FOR ALL TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

CREATE POLICY "Kunden can manage order_appointment_blocked_slots" ON public.order_appointment_blocked_slots
FOR ALL TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))));

-- ident_sessions
CREATE POLICY "Kunden can select ident_sessions" ON public.ident_sessions
FOR SELECT TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid())) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid()))));

CREATE POLICY "Kunden can update ident_sessions" ON public.ident_sessions
FOR UPDATE TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid())) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR branding_id IN (SELECT public.user_branding_ids(auth.uid())) OR contract_id IN (SELECT public.contracts_for_branding_ids(auth.uid()))));

-- brandings
CREATE POLICY "Kunden can select own brandings" ON public.brandings
FOR SELECT TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR id IN (SELECT public.user_branding_ids(auth.uid()))));

CREATE POLICY "Kunden can update own brandings" ON public.brandings
FOR UPDATE TO authenticated
USING (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR id IN (SELECT public.user_branding_ids(auth.uid()))))
WITH CHECK (public.is_kunde(auth.uid()) AND ((NOT public.user_has_any_branding(auth.uid())) OR id IN (SELECT public.user_branding_ids(auth.uid()))));