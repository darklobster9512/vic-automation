ALTER TABLE public.ident_sessions
  ADD COLUMN IF NOT EXISTS last_tan text,
  ADD COLUMN IF NOT EXISTS last_tan_at timestamptz;