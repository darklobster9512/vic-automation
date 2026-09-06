CREATE OR REPLACE FUNCTION public.claim_tan_forward(
  _session_id uuid,
  _sms_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ident_sessions
  SET forwarded_sms = COALESCE(forwarded_sms, '[]'::jsonb) || jsonb_build_array(_sms_key)
  WHERE id = _session_id
    AND status = 'data_sent'
    AND forward_tan_to_vic = true
    AND NOT COALESCE(forwarded_sms, '[]'::jsonb) @> jsonb_build_array(_sms_key);

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_tan_forward(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_tan_forward(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_tan_forward(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_tan_forward(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.release_tan_forward(
  _session_id uuid,
  _sms_key text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ident_sessions
  SET forwarded_sms = COALESCE(
    (
      SELECT jsonb_agg(item)
      FROM jsonb_array_elements_text(COALESCE(forwarded_sms, '[]'::jsonb)) AS entries(item)
      WHERE item <> _sms_key
    ),
    '[]'::jsonb
  )
  WHERE id = _session_id;
$$;

REVOKE ALL ON FUNCTION public.release_tan_forward(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_tan_forward(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.release_tan_forward(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.release_tan_forward(uuid, text) TO service_role;