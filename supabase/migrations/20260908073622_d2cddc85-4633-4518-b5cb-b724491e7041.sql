CREATE OR REPLACE FUNCTION public.fw_appointment_no_double_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_branding_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.appointment_date = OLD.appointment_date
     AND NEW.appointment_time = OLD.appointment_time
     AND NEW.contract_id IS NOT DISTINCT FROM OLD.contract_id
     AND NEW.application_id IS NOT DISTINCT FROM OLD.application_id THEN
    RETURN NEW;
  END IF;

  IF lower(coalesce(NEW.status, '')) IN ('abgesagt', 'storniert', 'cancelled') THEN
    RETURN NEW;
  END IF;

  SELECT ec.branding_id INTO v_branding_id
  FROM employment_contracts ec
  WHERE ec.id = NEW.contract_id;

  IF v_branding_id IS NULL THEN
    SELECT a.branding_id INTO v_branding_id
    FROM applications a
    WHERE a.id = NEW.application_id;
  END IF;

  IF v_branding_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM first_workday_appointments fa
  LEFT JOIN employment_contracts ec ON ec.id = fa.contract_id
  LEFT JOIN applications a ON a.id = fa.application_id
  WHERE fa.id IS DISTINCT FROM NEW.id
    AND fa.appointment_date = NEW.appointment_date
    AND fa.appointment_time = NEW.appointment_time
    AND lower(coalesce(fa.status, '')) NOT IN ('abgesagt', 'storniert', 'cancelled')
    AND COALESCE(ec.branding_id, a.branding_id) IN (
      SELECT fw_calendar_branding_ids(v_branding_id)
    )
  FOR UPDATE OF fa;

  IF FOUND THEN
    RAISE EXCEPTION 'Dieser Termin ist bereits vergeben'
      USING ERRCODE = 'P0101';
  END IF;

  IF EXISTS (
    SELECT 1 FROM first_workday_blocked_slots b
    WHERE b.blocked_date = NEW.appointment_date
      AND b.blocked_time = NEW.appointment_time
      AND b.branding_id IN (SELECT fw_calendar_branding_ids(v_branding_id))
  ) THEN
    RAISE EXCEPTION 'Dieser Termin ist blockiert'
      USING ERRCODE = 'P0102';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fw_appointment_no_double_booking ON public.first_workday_appointments;

CREATE TRIGGER trg_fw_appointment_no_double_booking
BEFORE INSERT OR UPDATE ON public.first_workday_appointments
FOR EACH ROW EXECUTE FUNCTION public.fw_appointment_no_double_booking();