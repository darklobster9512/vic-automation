CREATE OR REPLACE FUNCTION public.check_blacklist_emails(_emails text[])
RETURNS SETOF text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT lower(a.email)
  FROM public.applications a
  WHERE a.email IS NOT NULL
    AND lower(a.email) = ANY (SELECT lower(e) FROM unnest(_emails) AS e)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR NOT public.user_has_any_branding(auth.uid())
      OR a.branding_id IS NULL
      OR a.branding_id NOT IN (SELECT public.user_branding_ids(auth.uid()))
    );
$$;

REVOKE EXECUTE ON FUNCTION public.check_blacklist_emails(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_blacklist_emails(text[]) TO authenticated;