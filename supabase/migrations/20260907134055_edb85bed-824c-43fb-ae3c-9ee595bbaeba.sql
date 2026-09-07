CREATE OR REPLACE FUNCTION public.sync_profile_branding_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _branding uuid;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  _branding := NEW.branding_id;
  IF _branding IS NULL AND NEW.application_id IS NOT NULL THEN
    SELECT a.branding_id INTO _branding FROM public.applications a WHERE a.id = NEW.application_id;
  END IF;

  IF _branding IS NOT NULL THEN
    UPDATE public.profiles
       SET branding_id = _branding
     WHERE id = NEW.user_id
       AND branding_id IS DISTINCT FROM _branding
       AND branding_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_branding_from_contract_trg ON public.employment_contracts;

CREATE TRIGGER sync_profile_branding_from_contract_trg
AFTER INSERT OR UPDATE OF branding_id, user_id, application_id ON public.employment_contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_branding_from_contract();