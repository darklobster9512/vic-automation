DROP FUNCTION IF EXISTS public.interview_booked_slots_for_branding(uuid);

CREATE OR REPLACE FUNCTION public.interview_booked_slots_for_branding(_branding_id uuid)
 RETURNS TABLE(appointment_date date, appointment_time time without time zone, slot_index integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH scoped AS (
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
    SELECT s.id, s.appointment_date, s.appointment_time,
           ROW_NUMBER() OVER (
             PARTITION BY s.appointment_date, s.appointment_time
             ORDER BY s.created_at ASC
           )::int AS rn
    FROM scoped s
    WHERE s.slot_index IS NULL
  ),
  auto_resolved AS (
    SELECT a.appointment_date, a.appointment_time,
           (
             SELECT n FROM generate_series(1, 50) AS n
             WHERE NOT (n = ANY (COALESCE(m.taken, ARRAY[]::int[])))
             OFFSET a.rn - 1
             LIMIT 1
           )::int AS slot
    FROM auto a
    LEFT JOIN manual m
      ON m.appointment_date = a.appointment_date
     AND m.appointment_time = a.appointment_time
  )
  SELECT s.appointment_date, s.appointment_time, s.slot_index
  FROM scoped s WHERE s.slot_index IS NOT NULL
  UNION ALL
  SELECT ar.appointment_date, ar.appointment_time, ar.slot
  FROM auto_resolved ar;
$function$;