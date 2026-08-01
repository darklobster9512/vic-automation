CREATE TABLE public.caller_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  branding_id uuid NOT NULL REFERENCES public.brandings(id) ON DELETE CASCADE,
  slots integer[] NOT NULL DEFAULT '{1}',
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caller_api_keys TO authenticated;
GRANT ALL ON public.caller_api_keys TO service_role;
ALTER TABLE public.caller_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage caller api keys"
  ON public.caller_api_keys FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.caller_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_key_id uuid REFERENCES public.caller_api_keys(id) ON DELETE SET NULL,
  caller_label text NOT NULL,
  branding_id uuid,
  action text NOT NULL,
  appointment_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.caller_activity_log TO authenticated;
GRANT ALL ON public.caller_activity_log TO service_role;
ALTER TABLE public.caller_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read caller activity"
  ON public.caller_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_caller_activity_created ON public.caller_activity_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.interview_slots_for_branding(_branding_id uuid)
RETURNS TABLE(appointment_id uuid, slot integer, slot_total integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ia.id,
    ROW_NUMBER() OVER (
      PARTITION BY ia.appointment_date, ia.appointment_time
      ORDER BY ia.created_at ASC
    )::int AS slot,
    COUNT(*) OVER (
      PARTITION BY ia.appointment_date, ia.appointment_time
    )::int AS slot_total
  FROM public.interview_appointments ia
  JOIN public.applications a ON a.id = ia.application_id
  WHERE a.branding_id = _branding_id;
$$;