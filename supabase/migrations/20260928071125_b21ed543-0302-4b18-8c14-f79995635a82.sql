-- Helper: admin check via has_role if present, else user_roles fallback
CREATE OR REPLACE FUNCTION public.is_admin()
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

-- branding-logos: read all, write admin
DROP POLICY IF EXISTS "branding_logos_read" ON storage.objects;
CREATE POLICY "branding_logos_read" ON storage.objects FOR SELECT USING (bucket_id = 'branding-logos');
DROP POLICY IF EXISTS "branding_logos_insert" ON storage.objects;
CREATE POLICY "branding_logos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding-logos' AND public.is_admin());
DROP POLICY IF EXISTS "branding_logos_update" ON storage.objects;
CREATE POLICY "branding_logos_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding-logos' AND public.is_admin());
DROP POLICY IF EXISTS "branding_logos_delete" ON storage.objects;
CREATE POLICY "branding_logos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding-logos' AND public.is_admin());

-- avatars: read all, write own folder or admin
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- contract-documents: read all, write authenticated
DROP POLICY IF EXISTS "contract_documents_read" ON storage.objects;
CREATE POLICY "contract_documents_read" ON storage.objects FOR SELECT USING (bucket_id = 'contract-documents');
DROP POLICY IF EXISTS "contract_documents_insert" ON storage.objects;
CREATE POLICY "contract_documents_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contract-documents');
DROP POLICY IF EXISTS "contract_documents_update" ON storage.objects;
CREATE POLICY "contract_documents_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'contract-documents');
DROP POLICY IF EXISTS "contract_documents_delete" ON storage.objects;
CREATE POLICY "contract_documents_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'contract-documents');

-- application-documents: read all, insert all, modify admin
DROP POLICY IF EXISTS "application_documents_read" ON storage.objects;
CREATE POLICY "application_documents_read" ON storage.objects FOR SELECT USING (bucket_id = 'application-documents');
DROP POLICY IF EXISTS "application_documents_insert" ON storage.objects;
CREATE POLICY "application_documents_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'application-documents');
DROP POLICY IF EXISTS "application_documents_update" ON storage.objects;
CREATE POLICY "application_documents_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'application-documents' AND public.is_admin());
DROP POLICY IF EXISTS "application_documents_delete" ON storage.objects;
CREATE POLICY "application_documents_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'application-documents' AND public.is_admin());

-- chat-attachments: read all, insert all, modify admin
DROP POLICY IF EXISTS "chat_attachments_read" ON storage.objects;
CREATE POLICY "chat_attachments_read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;
CREATE POLICY "chat_attachments_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments');
DROP POLICY IF EXISTS "chat_attachments_update" ON storage.objects;
CREATE POLICY "chat_attachments_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chat-attachments' AND public.is_admin());
DROP POLICY IF EXISTS "chat_attachments_delete" ON storage.objects;
CREATE POLICY "chat_attachments_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-attachments' AND public.is_admin());

-- order-attachments: read all, insert/update authenticated, delete admin
DROP POLICY IF EXISTS "order_attachments_read" ON storage.objects;
CREATE POLICY "order_attachments_read" ON storage.objects FOR SELECT USING (bucket_id = 'order-attachments');
DROP POLICY IF EXISTS "order_attachments_insert" ON storage.objects;
CREATE POLICY "order_attachments_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'order-attachments');
DROP POLICY IF EXISTS "order_attachments_update" ON storage.objects;
CREATE POLICY "order_attachments_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'order-attachments');
DROP POLICY IF EXISTS "order_attachments_delete" ON storage.objects;
CREATE POLICY "order_attachments_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'order-attachments' AND public.is_admin());