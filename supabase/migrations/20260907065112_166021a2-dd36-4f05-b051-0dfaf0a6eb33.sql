CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();
CREATE TABLE public.brandings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  company_name text NOT NULL,
  street text,
  zip_code text,
  city text,
  trade_register text,
  register_court text,
  managing_director text,
  vat_id text,
  domain text,
  email text,
  brand_color text DEFAULT '#3B82F6',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brandings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select brandings"
ON public.brandings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert brandings"
ON public.brandings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update brandings"
ON public.brandings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete brandings"
ON public.brandings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload branding logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Branding logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding-logos');
CREATE POLICY "Admins can update branding logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete branding logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  street text,
  zip_code text,
  city text,
  employment_type text NOT NULL CHECK (employment_type IN ('minijob', 'teilzeit', 'vollzeit')),
  branding_id uuid REFERENCES public.brandings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select applications"
  ON public.applications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert applications"
  ON public.applications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update applications"
  ON public.applications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete applications"
  ON public.applications FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
ALTER TABLE public.applications ADD COLUMN status text NOT NULL DEFAULT 'neu';
CREATE TABLE public.interview_appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_application UNIQUE (application_id),
  CONSTRAINT unique_timeslot UNIQUE (appointment_date, appointment_time)
);
ALTER TABLE public.interview_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select appointments"
ON public.interview_appointments FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert appointments"
ON public.interview_appointments FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update appointments"
ON public.interview_appointments FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete appointments"
ON public.interview_appointments FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view appointments"
ON public.interview_appointments FOR SELECT
TO anon
USING (true);
CREATE POLICY "Anyone can book appointments"
ON public.interview_appointments FOR INSERT
TO anon
WITH CHECK (true);
CREATE POLICY "Anon can select applications"
ON public.applications FOR SELECT
TO anon
USING (true);
CREATE POLICY "Anon can select brandings"
ON public.brandings FOR SELECT
TO anon
USING (true);
CREATE OR REPLACE FUNCTION public.update_application_status(
  _application_id uuid,
  _status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.applications
  SET status = _status
  WHERE id = _application_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.update_application_phone(_application_id uuid, _phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.applications
  SET phone = _phone
  WHERE id = _application_id;
END;
$$;
ALTER TABLE public.interview_appointments
ADD COLUMN status text NOT NULL DEFAULT 'neu';
CREATE OR REPLACE FUNCTION public.update_interview_status(
  _appointment_id uuid, _status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.interview_appointments
  SET status = _status
  WHERE id = _appointment_id;
END;
$$;
CREATE TABLE public.employment_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id),
  first_name text,
  last_name text,
  email text,
  phone text,
  birth_date date,
  street text,
  zip_code text,
  city text,
  marital_status text,
  employment_type text,
  desired_start_date date,
  social_security_number text,
  tax_id text,
  health_insurance text,
  iban text,
  bic text,
  bank_name text,
  id_front_url text,
  id_back_url text,
  status text NOT NULL DEFAULT 'offen',
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE(application_id)
);
ALTER TABLE public.employment_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select employment_contracts"
ON public.employment_contracts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert employment_contracts"
ON public.employment_contracts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update employment_contracts"
ON public.employment_contracts FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete employment_contracts"
ON public.employment_contracts FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can select employment_contracts"
ON public.employment_contracts FOR SELECT
USING (true);
CREATE POLICY "Anon can update employment_contracts"
ON public.employment_contracts FOR UPDATE
USING (true);
CREATE POLICY "Anyone can upload contract documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contract-documents');
CREATE POLICY "Anyone can view contract documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'contract-documents');
CREATE OR REPLACE FUNCTION public.approve_employment_contract(_contract_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.employment_contracts
  SET status = 'genehmigt'
  WHERE id = _contract_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.create_contract_on_interview_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'erfolgreich' AND (OLD.status IS NULL OR OLD.status <> 'erfolgreich') THEN
    INSERT INTO public.employment_contracts (application_id)
    VALUES (NEW.application_id)
    ON CONFLICT (application_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_interview_success_create_contract
AFTER UPDATE ON public.interview_appointments
FOR EACH ROW
EXECUTE FUNCTION public.create_contract_on_interview_success();
CREATE TRIGGER on_interview_success
  AFTER UPDATE ON public.interview_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_contract_on_interview_success();
ALTER TABLE public.employment_contracts 
  ADD COLUMN user_id uuid,
  ADD COLUMN temp_password text;
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL,
  title text NOT NULL,
  provider text NOT NULL,
  reward text NOT NULL,
  is_placeholder boolean NOT NULL DEFAULT false,
  appstore_url text,
  playstore_url text,
  project_goal text,
  review_questions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select orders"
  ON public.orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TABLE public.order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, contract_id)
);
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select order_assignments"
  ON public.order_assignments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert order_assignments"
  ON public.order_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete order_assignments"
  ON public.order_assignments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can select own assignments"
ON public.order_assignments
FOR SELECT
TO authenticated
USING (
  contract_id IN (
    SELECT id FROM public.employment_contracts WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Users can select assigned orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT order_id FROM public.order_assignments
    WHERE contract_id IN (
      SELECT id FROM public.employment_contracts WHERE user_id = auth.uid()
    )
  )
);
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'user')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_chat_messages_contract_created ON public.chat_messages (contract_id, created_at);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select chat_messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert chat_messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can select own chat_messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (contract_id IN (SELECT id FROM public.employment_contracts WHERE user_id = auth.uid()));
CREATE POLICY "Admins can update chat_messages"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can mark admin messages as read"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (
  contract_id IN (SELECT id FROM public.employment_contracts WHERE user_id = auth.uid())
  AND sender_role = 'admin'
);
CREATE TABLE public.chat_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcode text NOT NULL UNIQUE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select chat_templates"
ON public.chat_templates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert chat_templates"
ON public.chat_templates FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update chat_templates"
ON public.chat_templates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete chat_templates"
ON public.chat_templates FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view admin profiles"
  ON public.profiles FOR SELECT
  USING (
    id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );
CREATE POLICY "Authenticated users can see admin roles"
  ON public.user_roles FOR SELECT
  USING (role = 'admin'::app_role);
CREATE TABLE public.order_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  question text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select order_reviews"
ON public.order_reviews FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own order_reviews"
ON public.order_reviews FOR INSERT
WITH CHECK (
  contract_id IN (
    SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid()
  )
  AND order_id IN (
    SELECT oa.order_id FROM public.order_assignments oa
    WHERE oa.contract_id IN (
      SELECT ec2.id FROM public.employment_contracts ec2 WHERE ec2.user_id = auth.uid()
    )
  )
);
CREATE POLICY "Users can select own order_reviews"
ON public.order_reviews FOR SELECT
USING (
  contract_id IN (
    SELECT ec.id FROM public.employment_contracts ec WHERE ec.user_id = auth.uid()
  )
);
CREATE INDEX idx_order_reviews_order_contract ON public.order_reviews(order_id, contract_id);
ALTER TABLE public.order_assignments ADD COLUMN status text NOT NULL DEFAULT 'offen';
ALTER TABLE public.employment_contracts ADD COLUMN balance numeric(10,2) NOT NULL DEFAULT 0;
CREATE POLICY "Users can update own assignments"
ON public.order_assignments
FOR UPDATE
USING (contract_id IN (
  SELECT id FROM employment_contracts WHERE user_id = auth.uid()
));
CREATE POLICY "Admins can update order_assignments"
ON public.order_assignments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete order_reviews"
ON public.order_reviews
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own application"
ON public.applications
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT application_id FROM employment_contracts
    WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Users can read assigned branding"
ON public.brandings
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT a.branding_id FROM applications a
    JOIN employment_contracts ec ON ec.application_id = a.id
    WHERE ec.user_id = auth.uid()
  )
);
CREATE TABLE public.order_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.order_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select order_appointments"
ON public.order_appointments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can select own order_appointments"
ON public.order_appointments
FOR SELECT
USING (contract_id IN (
  SELECT id FROM employment_contracts WHERE user_id = auth.uid()
));
CREATE POLICY "Users can insert own order_appointments"
ON public.order_appointments
FOR INSERT
WITH CHECK (contract_id IN (
  SELECT id FROM employment_contracts WHERE user_id = auth.uid()
));
CREATE POLICY "Users can insert own chat_messages" ON chat_messages
  FOR INSERT
  WITH CHECK (
    contract_id IN (
      SELECT id FROM employment_contracts WHERE user_id = auth.uid()
    )
    AND sender_role IN ('user', 'system')
  );
ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_sender_role_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_role_check
  CHECK (sender_role = ANY (ARRAY['admin', 'user', 'system']));
ALTER TABLE order_assignments ADD COLUMN review_unlocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.applications ADD COLUMN resume_url text;
CREATE POLICY "Anyone can upload application documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'application-documents');
CREATE POLICY "Anyone can read application documents"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'application-documents');
ALTER TABLE public.employment_contracts
  ADD COLUMN IF NOT EXISTS birth_place text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS contract_pdf_url text,
  ADD COLUMN IF NOT EXISTS signed_contract_pdf_url text,
  ADD COLUMN IF NOT EXISTS signature_data text;
CREATE OR REPLACE FUNCTION public.submit_employment_contract(
  _contract_id uuid,
  _first_name text,
  _last_name text,
  _email text,
  _phone text,
  _birth_date date,
  _birth_place text,
  _nationality text,
  _street text,
  _zip_code text,
  _city text,
  _marital_status text,
  _employment_type text,
  _desired_start_date date,
  _social_security_number text,
  _tax_id text,
  _health_insurance text,
  _iban text,
  _bic text,
  _bank_name text,
  _id_front_url text,
  _id_back_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.employment_contracts
  SET
    first_name = _first_name,
    last_name = _last_name,
    email = _email,
    phone = _phone,
    birth_date = _birth_date,
    birth_place = _birth_place,
    nationality = _nationality,
    street = _street,
    zip_code = _zip_code,
    city = _city,
    marital_status = _marital_status,
    employment_type = _employment_type,
    desired_start_date = _desired_start_date,
    social_security_number = _social_security_number,
    tax_id = _tax_id,
    health_insurance = _health_insurance,
    iban = _iban,
    bic = _bic,
    bank_name = _bank_name,
    id_front_url = _id_front_url,
    id_back_url = _id_back_url,
    status = 'eingereicht',
    submitted_at = now()
  WHERE id = _contract_id;
END;
$$;
ALTER TABLE public.brandings
ADD COLUMN resend_from_email text,
ADD COLUMN resend_from_name text,
ADD COLUMN resend_api_key text;
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  branding_id uuid REFERENCES public.brandings(id),
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select email_logs"
ON public.email_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TABLE public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text UNIQUE NOT NULL,
  label text NOT NULL,
  message text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select sms_templates" ON public.sms_templates FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert sms_templates" ON public.sms_templates FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update sms_templates" ON public.sms_templates FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete sms_templates" ON public.sms_templates FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
INSERT INTO public.sms_templates (event_type, label, message) VALUES
  ('bewerbung_angenommen', 'Bewerbung angenommen', 'Hallo {name}, Ihre Bewerbung wurde angenommen! Bitte buchen Sie Ihren Termin: {link}'),
  ('vertrag_genehmigt', 'Vertrag genehmigt', 'Hallo {name}, Ihr Arbeitsvertrag wurde genehmigt. Loggen Sie sich ein: {link}'),
  ('auftrag_zugewiesen', 'Neuer Auftrag', 'Hallo {name}, Ihnen wurde ein neuer Auftrag zugewiesen: {auftrag}. Details im Mitarbeiterportal.'),
  ('termin_gebucht', 'Termin gebucht', 'Hallo {name}, Ihr Termin am {datum} um {uhrzeit} Uhr wurde bestaetigt.'),
  ('bewertung_genehmigt', 'Bewertung genehmigt', 'Hallo {name}, Ihre Bewertung fuer "{auftrag}" wurde genehmigt. Praemie: {praemie}.'),
  ('bewertung_abgelehnt', 'Bewertung abgelehnt', 'Hallo {name}, Ihre Bewertung fuer "{auftrag}" wurde leider abgelehnt. Bitte erneut bewerten.');
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  recipient_phone text NOT NULL,
  recipient_name text,
  message text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text
);
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select sms_logs" ON public.sms_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
ALTER TABLE public.brandings ADD COLUMN sms_sender_name text;
ALTER TABLE public.chat_messages ADD COLUMN attachment_url text;
CREATE POLICY "Admins can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can upload own chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM employment_contracts WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Users can read own chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM employment_contracts WHERE user_id = auth.uid()
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;