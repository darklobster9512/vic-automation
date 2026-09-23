CREATE POLICY "Kunden can delete interview_appointments"
ON public.interview_appointments FOR DELETE TO authenticated
USING (
  is_kunde(auth.uid())
  AND (
    NOT user_has_any_branding(auth.uid())
    OR application_id IN (SELECT apps_for_branding_ids(auth.uid()))
  )
);

GRANT DELETE ON public.interview_appointments TO authenticated;