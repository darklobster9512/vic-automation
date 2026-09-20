ALTER TABLE public.brandings ADD COLUMN IF NOT EXISTS auto_distribution_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.auto_distribution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branding_id uuid NOT NULL REFERENCES public.brandings(id) ON DELETE CASCADE,
  run_date date NOT NULL,
  employees_served integer NOT NULL DEFAULT 0,
  assignments_created integer NOT NULL DEFAULT 0,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branding_id, run_date)
);

GRANT SELECT ON public.auto_distribution_runs TO authenticated;
GRANT ALL ON public.auto_distribution_runs TO service_role;

ALTER TABLE public.auto_distribution_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read auto distribution runs"
ON public.auto_distribution_runs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR branding_id IN (SELECT public.user_branding_ids(auth.uid()))
);