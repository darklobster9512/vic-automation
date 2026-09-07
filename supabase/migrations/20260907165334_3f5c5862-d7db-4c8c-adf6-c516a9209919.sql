CREATE TABLE public.order_review_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (order_id, contract_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_review_drafts TO authenticated;
GRANT ALL ON public.order_review_drafts TO service_role;

ALTER TABLE public.order_review_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and admins can select review drafts"
ON public.order_review_drafts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR contract_id IN (SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid())
);

CREATE POLICY "Users can insert own review drafts"
ON public.order_review_drafts FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR contract_id IN (SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid())
);

CREATE POLICY "Users can update own review drafts"
ON public.order_review_drafts FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR contract_id IN (SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR contract_id IN (SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid())
);

CREATE POLICY "Users can delete own review drafts"
ON public.order_review_drafts FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR contract_id IN (SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.order_review_drafts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_review_drafts_updated_at
BEFORE UPDATE ON public.order_review_drafts
FOR EACH ROW EXECUTE FUNCTION public.order_review_drafts_set_updated_at();