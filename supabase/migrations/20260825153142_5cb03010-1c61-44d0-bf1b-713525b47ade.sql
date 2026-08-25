CREATE OR REPLACE FUNCTION public.fw_calendar_branding_ids(_branding_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT unnest(
    CASE
      WHEN _branding_id IN (
        '371a2e6c-8a38-4c27-b4a4-34cf38694b1b'::uuid,
        '56aa260c-f3bc-44d3-a37b-ceb3ba01d2d9'::uuid,
        '5b5c01e7-101a-4ce5-b65b-221a2eb8d653'::uuid
      )
        THEN ARRAY[
          '371a2e6c-8a38-4c27-b4a4-34cf38694b1b'::uuid,
          '56aa260c-f3bc-44d3-a37b-ceb3ba01d2d9'::uuid,
          '5b5c01e7-101a-4ce5-b65b-221a2eb8d653'::uuid
        ]
      ELSE ARRAY[_branding_id]
    END
  );
$function$;

GRANT EXECUTE ON FUNCTION public.fw_calendar_branding_ids(uuid) TO anon, authenticated, service_role;