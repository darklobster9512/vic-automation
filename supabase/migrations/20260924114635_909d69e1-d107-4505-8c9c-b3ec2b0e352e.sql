GRANT SELECT ON public.brandings TO authenticated;

DROP POLICY IF EXISTS "Callers can select assigned brandings" ON public.brandings;
CREATE POLICY "Callers can select assigned brandings"
ON public.brandings
FOR SELECT
TO authenticated
USING (
  public.is_caller(auth.uid())
  AND id IN (SELECT public.user_branding_ids(auth.uid()))
);