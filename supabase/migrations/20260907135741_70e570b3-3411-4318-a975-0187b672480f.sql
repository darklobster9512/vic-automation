CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START 1;

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  contract_id uuid REFERENCES public.employment_contracts(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  branding_id uuid REFERENCES public.brandings(id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'sonstiges',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'offen',
  assigned_to uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_for_admin boolean NOT NULL DEFAULT true,
  unread_for_user boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  created_by uuid,
  content text NOT NULL DEFAULT '',
  attachment_url text,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_branding ON public.support_tickets(branding_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_last_msg ON public.support_tickets(last_message_at DESC);
CREATE INDEX idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;
GRANT USAGE ON SEQUENCE public.support_ticket_number_seq TO authenticated, service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets: employees
CREATE POLICY "Users can view own tickets" ON public.support_tickets
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own tickets" ON public.support_tickets
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tickets" ON public.support_tickets
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Tickets: admins
CREATE POLICY "Admins can view all tickets" ON public.support_tickets
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all tickets" ON public.support_tickets
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert tickets" ON public.support_tickets
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tickets: kunde
CREATE POLICY "Kunden can view branding tickets" ON public.support_tickets
FOR SELECT TO authenticated USING (
  public.is_kunde(auth.uid()) AND branding_id IN (SELECT public.user_branding_ids(auth.uid()))
);

CREATE POLICY "Kunden can update branding tickets" ON public.support_tickets
FOR UPDATE TO authenticated USING (
  public.is_kunde(auth.uid()) AND branding_id IN (SELECT public.user_branding_ids(auth.uid()))
) WITH CHECK (
  public.is_kunde(auth.uid()) AND branding_id IN (SELECT public.user_branding_ids(auth.uid()))
);

-- Messages: employees (no internal notes)
CREATE POLICY "Users can view own ticket messages" ON public.support_ticket_messages
FOR SELECT TO authenticated USING (
  is_internal = false
  AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
);

CREATE POLICY "Users can write own ticket messages" ON public.support_ticket_messages
FOR INSERT TO authenticated WITH CHECK (
  sender_role = 'user'
  AND is_internal = false
  AND created_by = auth.uid()
  AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
);

-- Messages: admins
CREATE POLICY "Admins can view all ticket messages" ON public.support_ticket_messages
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can write ticket messages" ON public.support_ticket_messages
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Messages: kunde
CREATE POLICY "Kunden can view branding ticket messages" ON public.support_ticket_messages
FOR SELECT TO authenticated USING (
  public.is_kunde(auth.uid())
  AND ticket_id IN (
    SELECT id FROM public.support_tickets
    WHERE branding_id IN (SELECT public.user_branding_ids(auth.uid()))
  )
);

CREATE POLICY "Kunden can write branding ticket messages" ON public.support_ticket_messages
FOR INSERT TO authenticated WITH CHECK (
  public.is_kunde(auth.uid())
  AND ticket_id IN (
    SELECT id FROM public.support_tickets
    WHERE branding_id IN (SELECT public.user_branding_ids(auth.uid()))
  )
);

-- Trigger: ticket number + branding/contract resolution
CREATE OR REPLACE FUNCTION public.support_ticket_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract record;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TCK-' || lpad(nextval('public.support_ticket_number_seq')::text, 5, '0');
  END IF;

  IF NEW.contract_id IS NULL OR NEW.branding_id IS NULL THEN
    SELECT ec.id, ec.branding_id INTO v_contract
    FROM public.employment_contracts ec
    WHERE ec.user_id = NEW.user_id
    ORDER BY ec.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      NEW.contract_id := COALESCE(NEW.contract_id, v_contract.id);
      NEW.branding_id := COALESCE(NEW.branding_id, v_contract.branding_id);
    END IF;
  END IF;

  IF NEW.branding_id IS NULL THEN
    SELECT p.branding_id INTO NEW.branding_id FROM public.profiles p WHERE p.id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_ticket_before_insert
BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_ticket_before_insert();

CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.email_queue_set_updated_at();

-- Trigger: message bookkeeping
CREATE OR REPLACE FUNCTION public.support_ticket_message_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_internal THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_role = 'user' THEN
    UPDATE public.support_tickets
    SET last_message_at = NEW.created_at,
        unread_for_admin = true,
        status = CASE WHEN status IN ('geschlossen','geloest') THEN 'offen'
                      WHEN status = 'wartet_auf_mitarbeiter' THEN 'in_bearbeitung'
                      ELSE status END,
        closed_at = CASE WHEN status IN ('geschlossen','geloest') THEN NULL ELSE closed_at END
    WHERE id = NEW.ticket_id;
  ELSE
    UPDATE public.support_tickets
    SET last_message_at = NEW.created_at,
        unread_for_user = true,
        unread_for_admin = false,
        status = CASE WHEN status = 'offen' THEN 'wartet_auf_mitarbeiter' ELSE status END
    WHERE id = NEW.ticket_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_ticket_message_after_insert
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.support_ticket_message_after_insert();

ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_ticket_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;

-- Storage policies for ticket attachments in chat-attachments bucket
CREATE POLICY "Ticket attachments upload by authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = 'tickets');

CREATE POLICY "Ticket attachments read by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = 'tickets');
