INSERT INTO public.kunde_brandings (user_id, branding_id)
SELECT
  '96126f36-85a8-403b-b9de-e7b257844a0a'::uuid,
  'd212b0e8-98e1-4727-b370-b850275a7dd0'::uuid
WHERE NOT EXISTS (
  SELECT 1
  FROM public.kunde_brandings
  WHERE user_id = '96126f36-85a8-403b-b9de-e7b257844a0a'::uuid
    AND branding_id = 'd212b0e8-98e1-4727-b370-b850275a7dd0'::uuid
);

GRANT SELECT, UPDATE ON public.applications TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.interview_appointments TO authenticated;
GRANT SELECT ON public.trial_day_appointments TO authenticated;

DROP POLICY IF EXISTS "Callers can select assigned applications" ON public.applications;
CREATE POLICY "Callers can select assigned applications"
ON public.applications
FOR SELECT
TO authenticated
USING (
  public.is_caller(auth.uid())
  AND branding_id IN (SELECT public.user_branding_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Callers can update assigned applications" ON public.applications;
CREATE POLICY "Callers can update assigned applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (
  public.is_caller(auth.uid())
  AND branding_id IN (SELECT public.user_branding_ids(auth.uid()))
)
WITH CHECK (
  public.is_caller(auth.uid())
  AND branding_id IN (SELECT public.user_branding_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Callers can select assigned interview appointments" ON public.interview_appointments;
CREATE POLICY "Callers can select assigned interview appointments"
ON public.interview_appointments
FOR SELECT
TO authenticated
USING (
  public.is_caller(auth.uid())
  AND application_id IN (SELECT public.apps_for_branding_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Callers can update assigned interview appointments" ON public.interview_appointments;
CREATE POLICY "Callers can update assigned interview appointments"
ON public.interview_appointments
FOR UPDATE
TO authenticated
USING (
  public.is_caller(auth.uid())
  AND application_id IN (SELECT public.apps_for_branding_ids(auth.uid()))
)
WITH CHECK (
  public.is_caller(auth.uid())
  AND application_id IN (SELECT public.apps_for_branding_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Callers can delete assigned interview appointments" ON public.interview_appointments;
CREATE POLICY "Callers can delete assigned interview appointments"
ON public.interview_appointments
FOR DELETE
TO authenticated
USING (
  public.is_caller(auth.uid())
  AND application_id IN (SELECT public.apps_for_branding_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Callers can select assigned trial day appointments" ON public.trial_day_appointments;
CREATE POLICY "Callers can select assigned trial day appointments"
ON public.trial_day_appointments
FOR SELECT
TO authenticated
USING (
  public.is_caller(auth.uid())
  AND application_id IN (SELECT public.apps_for_branding_ids(auth.uid()))
);