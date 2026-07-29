CREATE OR REPLACE FUNCTION public.unassign_order(_order_id uuid, _contract_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branding_id uuid;
BEGIN
  SELECT branding_id INTO v_branding_id FROM public.orders WHERE id = _order_id;

  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR (v_branding_id IS NOT NULL AND v_branding_id IN (SELECT public.user_branding_ids(auth.uid())))
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  DELETE FROM public.order_reviews WHERE order_id = _order_id AND contract_id = _contract_id;
  DELETE FROM public.order_attachments WHERE order_id = _order_id AND contract_id = _contract_id;
  DELETE FROM public.order_appointments WHERE order_id = _order_id AND contract_id = _contract_id;
  DELETE FROM public.ident_sessions WHERE order_id = _order_id AND contract_id = _contract_id;
  DELETE FROM public.order_assignments WHERE order_id = _order_id AND contract_id = _contract_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unassign_order(uuid, uuid) TO authenticated;