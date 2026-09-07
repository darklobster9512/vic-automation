CREATE OR REPLACE FUNCTION public.update_own_contract_details(
  _phone text,
  _street text,
  _zip_code text,
  _city text,
  _iban text,
  _bic text,
  _bank_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;

  SELECT id INTO v_id
  FROM public.employment_contracts
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Kein Vertrag gefunden';
  END IF;

  UPDATE public.employment_contracts
  SET phone = NULLIF(trim(_phone), ''),
      street = NULLIF(trim(_street), ''),
      zip_code = NULLIF(trim(_zip_code), ''),
      city = NULLIF(trim(_city), ''),
      iban = NULLIF(upper(replace(coalesce(_iban,''), ' ', '')), ''),
      bic = NULLIF(upper(trim(coalesce(_bic,''))), ''),
      bank_name = NULLIF(trim(coalesce(_bank_name,'')), '')
  WHERE id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_contract_details(text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_contract_details(text,text,text,text,text,text,text) TO authenticated;