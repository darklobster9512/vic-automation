CREATE OR REPLACE FUNCTION public.resolved_interview_slots_for_branding(_branding_id uuid)
RETURNS TABLE(
  appointment_id uuid,
  appointment_date date,
  appointment_time time without time zone,
  slot_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH primary_settings AS (
    SELECT bs.*
    FROM public.branding_schedule_settings bs
    WHERE bs.branding_id = _branding_id
      AND bs.schedule_type = 'interview'
    ORDER BY CASE WHEN bs.slot_index = 1 THEN 0 ELSE 1 END, bs.slot_index
    LIMIT 1
  ),
  scoped AS (
    SELECT ia.id, ia.appointment_date, ia.appointment_time, ia.created_at, ia.slot_index
    FROM public.interview_appointments ia
    JOIN public.applications a ON a.id = ia.application_id
    WHERE a.branding_id = _branding_id
  ),
  manual AS (
    SELECT s.appointment_date, s.appointment_time, array_agg(s.slot_index) AS taken
    FROM scoped s
    WHERE s.slot_index IS NOT NULL
    GROUP BY s.appointment_date, s.appointment_time
  ),
  auto AS (
    SELECT s.*,
           row_number() OVER (
             PARTITION BY s.appointment_date, s.appointment_time
             ORDER BY s.created_at, s.id
           )::integer AS rn
    FROM scoped s
    WHERE s.slot_index IS NULL
  ),
  auto_resolved AS (
    SELECT a.id,
           a.appointment_date,
           a.appointment_time,
           valid.slot_index
    FROM auto a
    LEFT JOIN manual m
      ON m.appointment_date = a.appointment_date
     AND m.appointment_time = a.appointment_time
    LEFT JOIN LATERAL (
      SELECT candidate.slot_index
      FROM generate_series(1, (SELECT interview_slots_per_time FROM primary_settings)) AS candidate(slot_index)
      LEFT JOIN public.branding_schedule_settings lane
        ON lane.branding_id = _branding_id
       AND lane.schedule_type = 'interview'
       AND lane.slot_index = candidate.slot_index
      CROSS JOIN primary_settings p
      WHERE NOT (candidate.slot_index = ANY(COALESCE(m.taken, ARRAY[]::integer[])))
        AND extract(isodow from a.appointment_date)::integer = ANY(COALESCE(lane.available_days, p.available_days))
        AND a.appointment_time >= COALESCE(
          CASE WHEN extract(isodow from a.appointment_date)::integer IN (6, 7)
            THEN lane.weekend_start_time END,
          lane.start_time,
          CASE WHEN extract(isodow from a.appointment_date)::integer IN (6, 7)
            THEN p.weekend_start_time END,
          p.start_time
        )
        AND a.appointment_time < COALESCE(
          CASE WHEN extract(isodow from a.appointment_date)::integer IN (6, 7)
            THEN lane.weekend_end_time END,
          lane.end_time,
          CASE WHEN extract(isodow from a.appointment_date)::integer IN (6, 7)
            THEN p.weekend_end_time END,
          p.end_time
        )
        AND NOT (
          COALESCE(lane.lunch_break_enabled, p.lunch_break_enabled, false)
          AND a.appointment_time >= COALESCE(lane.lunch_break_start, p.lunch_break_start)
          AND a.appointment_time < COALESCE(lane.lunch_break_end, p.lunch_break_end)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.schedule_blocked_slots blocked
          WHERE blocked.branding_id = _branding_id
            AND blocked.blocked_date = a.appointment_date
            AND blocked.blocked_time = a.appointment_time
            AND (blocked.slot_index IS NULL OR blocked.slot_index = candidate.slot_index)
        )
      ORDER BY candidate.slot_index
      OFFSET a.rn - 1
      LIMIT 1
    ) valid ON true
  )
  SELECT s.id, s.appointment_date, s.appointment_time, s.slot_index
  FROM scoped s
  WHERE s.slot_index IS NOT NULL
  UNION ALL
  SELECT ar.id, ar.appointment_date, ar.appointment_time, ar.slot_index
  FROM auto_resolved ar;
$$;

REVOKE ALL ON FUNCTION public.resolved_interview_slots_for_branding(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolved_interview_slots_for_branding(uuid) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.interview_booked_slots_for_branding(uuid);
CREATE FUNCTION public.interview_booked_slots_for_branding(_branding_id uuid)
RETURNS TABLE(appointment_date date, appointment_time time without time zone, slot_index integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT resolved.appointment_date, resolved.appointment_time, resolved.slot_index
  FROM public.resolved_interview_slots_for_branding(_branding_id) resolved;
$$;

REVOKE ALL ON FUNCTION public.interview_booked_slots_for_branding(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.interview_booked_slots_for_branding(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.interview_slots_for_branding(_branding_id uuid)
RETURNS TABLE(appointment_id uuid, slot integer, slot_total integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT resolved.appointment_id,
         resolved.slot_index AS slot,
         count(*) OVER (
           PARTITION BY resolved.appointment_date, resolved.appointment_time
         )::integer AS slot_total
  FROM public.resolved_interview_slots_for_branding(_branding_id) resolved;
$$;

REVOKE ALL ON FUNCTION public.interview_slots_for_branding(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.interview_slots_for_branding(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.book_interview_public(
  _application_id uuid,
  _appointment_date date,
  _appointment_time time without time zone
)
RETURNS TABLE(appointment_id uuid, slot_index integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branding_id uuid;
  v_created_by uuid;
  v_existing_id uuid;
  v_slot integer;
BEGIN
  SELECT a.branding_id, a.created_by
    INTO v_branding_id, v_created_by
  FROM public.applications a
  WHERE a.id = _application_id;

  IF v_branding_id IS NULL THEN
    RAISE EXCEPTION 'Bewerbung nicht gefunden';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(v_branding_id::text),
    hashtext(_appointment_date::text || '|' || _appointment_time::text)
  );

  SELECT ia.id INTO v_existing_id
  FROM public.interview_appointments ia
  WHERE ia.application_id = _application_id
  ORDER BY ia.created_at DESC
  LIMIT 1;

  WITH primary_settings AS (
    SELECT bs.*
    FROM public.branding_schedule_settings bs
    WHERE bs.branding_id = v_branding_id
      AND bs.schedule_type = 'interview'
    ORDER BY CASE WHEN bs.slot_index = 1 THEN 0 ELSE 1 END, bs.slot_index
    LIMIT 1
  ),
  taken AS (
    SELECT resolved.slot_index
    FROM public.resolved_interview_slots_for_branding(v_branding_id) resolved
    WHERE resolved.appointment_date = _appointment_date
      AND resolved.appointment_time = _appointment_time
      AND resolved.appointment_id IS DISTINCT FROM v_existing_id
      AND resolved.slot_index IS NOT NULL
  )
  SELECT candidate.slot_index INTO v_slot
  FROM generate_series(1, (SELECT interview_slots_per_time FROM primary_settings)) AS candidate(slot_index)
  LEFT JOIN public.branding_schedule_settings lane
    ON lane.branding_id = v_branding_id
   AND lane.schedule_type = 'interview'
   AND lane.slot_index = candidate.slot_index
  CROSS JOIN primary_settings p
  WHERE extract(isodow from _appointment_date)::integer = ANY(COALESCE(lane.available_days, p.available_days))
    AND _appointment_time >= COALESCE(
      CASE WHEN extract(isodow from _appointment_date)::integer IN (6, 7)
        THEN lane.weekend_start_time END,
      lane.start_time,
      CASE WHEN extract(isodow from _appointment_date)::integer IN (6, 7)
        THEN p.weekend_start_time END,
      p.start_time
    )
    AND _appointment_time < COALESCE(
      CASE WHEN extract(isodow from _appointment_date)::integer IN (6, 7)
        THEN lane.weekend_end_time END,
      lane.end_time,
      CASE WHEN extract(isodow from _appointment_date)::integer IN (6, 7)
        THEN p.weekend_end_time END,
      p.end_time
    )
    AND NOT (
      COALESCE(lane.lunch_break_enabled, p.lunch_break_enabled, false)
      AND _appointment_time >= COALESCE(lane.lunch_break_start, p.lunch_break_start)
      AND _appointment_time < COALESCE(lane.lunch_break_end, p.lunch_break_end)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.schedule_blocked_slots blocked
      WHERE blocked.branding_id = v_branding_id
        AND blocked.blocked_date = _appointment_date
        AND blocked.blocked_time = _appointment_time
        AND (blocked.slot_index IS NULL OR blocked.slot_index = candidate.slot_index)
    )
    AND NOT EXISTS (
      SELECT 1 FROM taken WHERE taken.slot_index = candidate.slot_index
    )
  ORDER BY candidate.slot_index
  LIMIT 1;

  IF v_slot IS NULL THEN
    RAISE EXCEPTION 'Dieser Termin ist nicht mehr verfügbar';
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.interview_appointments
    SET appointment_date = _appointment_date,
        appointment_time = _appointment_time,
        slot_index = v_slot,
        status = 'offen'
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.interview_appointments (
      application_id, appointment_date, appointment_time, slot_index, created_by
    ) VALUES (
      _application_id, _appointment_date, _appointment_time, v_slot, v_created_by
    )
    RETURNING id INTO v_existing_id;
  END IF;

  UPDATE public.applications
  SET status = 'termin_gebucht'
  WHERE id = _application_id;

  RETURN QUERY SELECT v_existing_id, v_slot;
END;
$$;

REVOKE ALL ON FUNCTION public.book_interview_public(uuid, date, time without time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_interview_public(uuid, date, time without time zone) TO anon, authenticated, service_role;