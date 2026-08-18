CREATE OR REPLACE FUNCTION public.fw_calendar_branding_ids(_branding_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT unnest(
    CASE
      WHEN _branding_id IN ('371a2e6c-8a38-4c27-b4a4-34cf38694b1b'::uuid, '56aa260c-f3bc-44d3-a37b-ceb3ba01d2d9'::uuid)
        THEN ARRAY['371a2e6c-8a38-4c27-b4a4-34cf38694b1b'::uuid, '56aa260c-f3bc-44d3-a37b-ceb3ba01d2d9'::uuid]
      ELSE ARRAY[_branding_id]
    END
  );
$$;

GRANT EXECUTE ON FUNCTION public.fw_calendar_branding_ids(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.booked_slots_for_branding(_branding_id uuid)
RETURNS TABLE(appointment_date date, appointment_time time without time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT fwa.appointment_date, fwa.appointment_time
  FROM first_workday_appointments fwa
  WHERE fwa.contract_id IN (
    SELECT id FROM employment_contracts
    WHERE branding_id IN (SELECT fw_calendar_branding_ids(_branding_id))
  )
  UNION
  SELECT fwa.appointment_date, fwa.appointment_time
  FROM first_workday_appointments fwa
  WHERE fwa.application_id IN (
    SELECT id FROM applications
    WHERE branding_id IN (SELECT fw_calendar_branding_ids(_branding_id))
  )
  UNION
  SELECT tda.appointment_date, tda.appointment_time
  FROM trial_day_appointments tda
  WHERE tda.application_id IN (
    SELECT id FROM applications
    WHERE branding_id IN (SELECT fw_calendar_branding_ids(_branding_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.book_first_workday_public(_contract_id uuid, _appointment_date date, _appointment_time time without time zone, _phone text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  v_branding_id uuid;
  v_settings record;
  v_available_days int[];
  v_start time;
  v_end time;
  v_iso_dow int;
  v_is_weekend boolean;
BEGIN
  SELECT ec.branding_id INTO v_branding_id
  FROM employment_contracts ec
  WHERE ec.id = _contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  SELECT available_days, start_time, end_time, weekend_start_time, weekend_end_time
  INTO v_settings
  FROM branding_schedule_settings
  WHERE branding_id = v_branding_id AND schedule_type = 'trial'
  LIMIT 1;

  IF v_settings IS NULL THEN
    v_available_days := ARRAY[1,2,3,4,5,6];
    v_start := '08:00'::time;
    v_end := '18:00'::time;
  ELSE
    v_available_days := COALESCE(v_settings.available_days, ARRAY[1,2,3,4,5,6]);
    v_iso_dow := EXTRACT(ISODOW FROM _appointment_date)::int;
    v_is_weekend := v_iso_dow IN (6,7);
    IF v_is_weekend AND v_settings.weekend_start_time IS NOT NULL THEN
      v_start := v_settings.weekend_start_time;
      v_end := COALESCE(v_settings.weekend_end_time, v_settings.end_time, '18:00'::time);
    ELSE
      v_start := COALESCE(v_settings.start_time, '08:00'::time);
      v_end := COALESCE(v_settings.end_time, '18:00'::time);
    END IF;
  END IF;

  v_iso_dow := EXTRACT(ISODOW FROM _appointment_date)::int;

  IF NOT (v_iso_dow = ANY(v_available_days)) THEN
    RAISE EXCEPTION 'Dieser Wochentag ist nicht verfügbar';
  END IF;

  IF _appointment_time < v_start OR _appointment_time >= v_end THEN
    RAISE EXCEPTION 'Diese Uhrzeit liegt außerhalb der verfügbaren Zeit';
  END IF;

  IF EXISTS (
    SELECT 1 FROM first_workday_blocked_slots
    WHERE branding_id IN (SELECT fw_calendar_branding_ids(v_branding_id))
      AND blocked_date = _appointment_date
      AND blocked_time = _appointment_time
  ) OR EXISTS (
    SELECT 1 FROM trial_day_blocked_slots
    WHERE branding_id IN (SELECT fw_calendar_branding_ids(v_branding_id))
      AND blocked_date = _appointment_date
      AND blocked_time = _appointment_time
  ) THEN
    RAISE EXCEPTION 'Dieser Termin ist blockiert';
  END IF;

  IF EXISTS (
    SELECT 1 FROM booked_slots_for_branding(v_branding_id) bs
    WHERE bs.appointment_date = _appointment_date
      AND bs.appointment_time = _appointment_time
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM first_workday_appointments
      WHERE contract_id = _contract_id
        AND appointment_date = _appointment_date
        AND appointment_time = _appointment_time
    ) THEN
      RAISE EXCEPTION 'Dieser Termin ist bereits vergeben';
    END IF;
  END IF;

  DELETE FROM first_workday_appointments WHERE contract_id = _contract_id;

  INSERT INTO first_workday_appointments (contract_id, application_id, appointment_date, appointment_time, created_by)
  SELECT _contract_id, ec.application_id, _appointment_date, _appointment_time, ec.created_by
  FROM employment_contracts ec
  WHERE ec.id = _contract_id
  RETURNING id INTO new_id;

  IF _phone IS NOT NULL AND _phone <> '' THEN
    UPDATE employment_contracts SET phone = _phone WHERE id = _contract_id;
  END IF;

  RETURN new_id;
END;
$function$;