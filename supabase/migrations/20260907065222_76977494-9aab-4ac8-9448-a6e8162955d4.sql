ALTER TABLE public.applications ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.applications ALTER COLUMN employment_type DROP NOT NULL;
ALTER TABLE public.applications ADD COLUMN is_indeed boolean NOT NULL DEFAULT false;
CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  target_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can select short_links"
  ON public.short_links FOR SELECT
  USING (true);
CREATE POLICY "Admins can insert short_links"
  ON public.short_links FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
INSERT INTO public.sms_templates (event_type, label, message)
VALUES (
  'indeed_bewerbung_angenommen',
  'Indeed Bewerbung angenommen',
  'Hallo {name}, vielen Dank fuer Ihre Bewerbung bei {unternehmen}, bitte buchen Sie ein Bewerbungsgespraech unter {link}.'
);
CREATE TABLE public.telegram_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL,
  label text NOT NULL DEFAULT '',
  events text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select telegram_chats"
  ON public.telegram_chats FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert telegram_chats"
  ON public.telegram_chats FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update telegram_chats"
  ON public.telegram_chats FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete telegram_chats"
  ON public.telegram_chats FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  allowed_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, allowed_path)
);
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own permissions"
  ON public.admin_permissions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all permissions"
  ON public.admin_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.schedule_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '18:00',
  slot_interval_minutes integer NOT NULL DEFAULT 30,
  available_days integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage schedule_settings"
  ON public.schedule_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can read schedule_settings"
  ON public.schedule_settings FOR SELECT
  USING (true);
INSERT INTO public.schedule_settings (start_time, end_time, slot_interval_minutes, available_days)
VALUES ('08:00', '18:00', 30, '{1,2,3,4,5,6}');
CREATE TABLE public.schedule_blocked_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date date NOT NULL,
  blocked_time time NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage schedule_blocked_slots"
  ON public.schedule_blocked_slots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can read schedule_blocked_slots"
  ON public.schedule_blocked_slots FOR SELECT
  USING (true);
ALTER TABLE public.brandings ADD COLUMN phone text;
INSERT INTO public.sms_templates (event_type, label, message)
VALUES ('gespraech_erinnerung', 'Bewerbungsgespräch Erinnerung', 'Hallo {name}, Sie hatten einen Termin bei uns, waren aber leider nicht erreichbar. Bitte rufen Sie uns an: {telefon}.');
ALTER TABLE public.schedule_settings
  ADD COLUMN new_slot_interval_minutes integer,
  ADD COLUMN interval_change_date date;
ALTER TABLE public.chat_messages ADD COLUMN metadata jsonb DEFAULT NULL;
CREATE POLICY "Users can insert own assignments from chat offers"
  ON public.order_assignments
  FOR INSERT
  WITH CHECK (
    contract_id IN (
      SELECT id FROM employment_contracts
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM chat_messages
      WHERE chat_messages.contract_id = order_assignments.contract_id
        AND chat_messages.sender_role = 'system'
        AND (chat_messages.metadata->>'type') = 'order_offer'
        AND (chat_messages.metadata->>'order_id')::uuid = order_assignments.order_id
    )
  );
CREATE TABLE public.order_appointment_blocked_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date date NOT NULL,
  blocked_time time NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_appointment_blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage order_appointment_blocked_slots"
  ON public.order_appointment_blocked_slots
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read order_appointment_blocked_slots"
  ON public.order_appointment_blocked_slots
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
ALTER TABLE public.employment_contracts ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;
CREATE TABLE public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage phone_numbers"
  ON public.phone_numbers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE TABLE public.sms_spoof_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sender_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_spoof_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sms_spoof_templates"
  ON public.sms_spoof_templates
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.sms_spoof_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone text NOT NULL,
  recipient_name text,
  sender_name text NOT NULL,
  message text NOT NULL,
  template_id uuid REFERENCES public.sms_spoof_templates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_spoof_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select sms_spoof_logs"
  ON public.sms_spoof_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.telegram_chats 
ADD COLUMN branding_ids uuid[] NOT NULL DEFAULT '{}';
CREATE TABLE public.branding_schedule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branding_id uuid NOT NULL REFERENCES public.brandings(id) ON DELETE CASCADE,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '18:00',
  slot_interval_minutes integer NOT NULL DEFAULT 20,
  available_days integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branding_id)
);
ALTER TABLE public.branding_schedule_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage branding_schedule_settings" ON public.branding_schedule_settings
FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can read branding_schedule_settings" ON public.branding_schedule_settings
FOR SELECT TO public USING (true);
ALTER TABLE public.schedule_blocked_slots ADD COLUMN branding_id uuid REFERENCES public.brandings(id);
ALTER TABLE public.order_appointment_blocked_slots ADD COLUMN branding_id uuid REFERENCES public.brandings(id);
UPDATE public.schedule_settings SET slot_interval_minutes = 20, new_slot_interval_minutes = NULL, interval_change_date = NULL;
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kunde';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;