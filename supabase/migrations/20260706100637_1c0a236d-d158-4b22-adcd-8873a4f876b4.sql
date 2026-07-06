CREATE TABLE public.edge_cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.edge_cache TO service_role;
ALTER TABLE public.edge_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX edge_cache_expires_at_idx ON public.edge_cache (expires_at);