ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

UPDATE public.applications a
SET accepted_at = COALESCE(
  (SELECT MIN(ia.created_at) FROM public.interview_appointments ia WHERE ia.application_id = a.id),
  a.created_at
)
WHERE a.accepted_at IS NULL
  AND a.status NOT IN ('neu','abgelehnt');

CREATE INDEX IF NOT EXISTS applications_accepted_at_idx ON public.applications (branding_id, accepted_at);