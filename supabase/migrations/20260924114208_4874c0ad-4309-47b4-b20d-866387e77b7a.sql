GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions, public.kunde_brandings TO authenticated;
GRANT ALL ON public.admin_permissions, public.kunde_brandings TO service_role;
INSERT INTO public.admin_permissions (user_id, allowed_path)
SELECT '96126f36-85a8-403b-b9de-e7b257844a0a', p FROM unnest(ARRAY['/admin/bewerbungsgespraeche','/admin/bewerbungen']) p
WHERE NOT EXISTS (SELECT 1 FROM public.admin_permissions WHERE user_id='96126f36-85a8-403b-b9de-e7b257844a0a' AND allowed_path=p);