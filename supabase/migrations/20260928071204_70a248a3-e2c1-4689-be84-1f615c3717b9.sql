CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION private.is_admin() FROM anon, public;

-- Drop dependent policies first
DROP POLICY IF EXISTS "branding_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "branding_logos_update" ON storage.objects;
DROP POLICY IF EXISTS "branding_logos_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
DROP POLICY IF EXISTS "application_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "application_documents_delete" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete" ON storage.objects;
DROP POLICY IF EXISTS "order_attachments_delete" ON storage.objects;

DROP FUNCTION IF EXISTS public.is_admin();

-- Recreate policies using the private helper
CREATE POLICY "branding_logos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding-logos' AND private.is_admin());
CREATE POLICY "branding_logos_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding-logos' AND private.is_admin());
CREATE POLICY "branding_logos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding-logos' AND private.is_admin());

CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.is_admin()));
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.is_admin()));
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.is_admin()));

CREATE POLICY "application_documents_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'application-documents' AND private.is_admin());
CREATE POLICY "application_documents_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'application-documents' AND private.is_admin());

CREATE POLICY "chat_attachments_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chat-attachments' AND private.is_admin());
CREATE POLICY "chat_attachments_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-attachments' AND private.is_admin());

CREATE POLICY "order_attachments_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'order-attachments' AND private.is_admin());