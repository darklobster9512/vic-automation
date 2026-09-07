CREATE OR REPLACE FUNCTION public.support_ticket_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract record;
  v_candidate text;
  v_tries int := 0;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    LOOP
      v_tries := v_tries + 1;
      v_candidate := 'TICKET-' || (10000 + floor(random() * 90000)::int)::text;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.support_tickets st WHERE st.ticket_number = v_candidate
      );
      IF v_tries > 50 THEN
        v_candidate := 'TICKET-' || (10000 + floor(random() * 90000)::int)::text || '-' || substr(md5(random()::text), 1, 4);
        EXIT;
      END IF;
    END LOOP;
    NEW.ticket_number := v_candidate;
  END IF;

  IF NEW.contract_id IS NULL OR NEW.branding_id IS NULL THEN
    SELECT ec.id, ec.branding_id INTO v_contract
    FROM public.employment_contracts ec
    WHERE ec.user_id = NEW.user_id
    ORDER BY ec.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      NEW.contract_id := COALESCE(NEW.contract_id, v_contract.id);
      NEW.branding_id := COALESCE(NEW.branding_id, v_contract.branding_id);
    END IF;
  END IF;

  IF NEW.branding_id IS NULL THEN
    SELECT p.branding_id INTO NEW.branding_id FROM public.profiles p WHERE p.id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP SEQUENCE IF EXISTS public.support_ticket_number_seq;