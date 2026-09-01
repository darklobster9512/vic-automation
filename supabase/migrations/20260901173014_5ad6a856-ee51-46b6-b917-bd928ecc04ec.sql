CREATE TABLE public.webid_redirect_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text,
  source text,
  user_agent text,
  referrer text,
  path text,
  forwarded boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.webid_redirect_logs TO authenticated;
GRANT ALL ON public.webid_redirect_logs TO service_role;

ALTER TABLE public.webid_redirect_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read webid redirect logs"
ON public.webid_redirect_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));