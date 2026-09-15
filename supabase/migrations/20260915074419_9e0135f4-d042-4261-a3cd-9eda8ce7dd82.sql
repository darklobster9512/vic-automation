CREATE TABLE IF NOT EXISTS public.bulk_accept_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branding_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'running',
  processed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped_ids uuid[] NOT NULL DEFAULT '{}',
  failed_ids uuid[] NOT NULL DEFAULT '{}',
  attempts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT ON public.bulk_accept_runs TO authenticated;
GRANT ALL ON public.bulk_accept_runs TO service_role;

ALTER TABLE public.bulk_accept_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view bulk accept runs" ON public.bulk_accept_runs;
CREATE POLICY "Admins can view bulk accept runs"
ON public.bulk_accept_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));