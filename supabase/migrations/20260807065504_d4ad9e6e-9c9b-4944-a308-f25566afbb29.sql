CREATE TABLE public.ident_info_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branding_id uuid REFERENCES public.brandings(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ident_info_templates TO authenticated;
GRANT ALL ON public.ident_info_templates TO service_role;

ALTER TABLE public.ident_info_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ident info templates"
ON public.ident_info_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Kunden manage own branding ident info templates"
ON public.ident_info_templates FOR ALL TO authenticated
USING (branding_id IN (SELECT public.user_branding_ids(auth.uid())))
WITH CHECK (branding_id IN (SELECT public.user_branding_ids(auth.uid())));

CREATE TRIGGER ident_info_templates_updated_at
BEFORE UPDATE ON public.ident_info_templates
FOR EACH ROW EXECUTE FUNCTION public.email_queue_set_updated_at();

INSERT INTO public.ident_info_templates (branding_id, name, content)
SELECT b.id, 'Demo-WebID', E'Öffne den bereitgestellten Demo-WebID-Link auf einem Gerät mit Kamera und Mikrofon. Nutze ausschließlich die vorgegebenen Demo-Daten und den bereitgestellten Link.\n\nAm Ende des Video-Calls musst du den Identprozess mit einem SMS-Code bestätigen. Dieser wird automatisch im Testdaten-Feld unter „Nummer / SMS-Code" angezeigt.\n\nFür eine möglichst realistische Nutzererfahrung nutze bitte während des Identprozesses die vorgegebenen Fragen und Antworten aus der Testdaten-Ansicht.\n\nFrage:\n\n„Machst du den Identprozess alleine oder zwingt dich jemand dazu?"\n\nAntwort:\n\n„Nein, ich führe den Prozess aus eigenen Stücken durch. Niemand zwingt mich"\n\nFrage:\n\n„Welchen Zweck hat dieser Identprozess für Dich?"\n\nAntwort:\n\n„Ich führe diesen Prozess durch, um mich bei der DKB AG zu identifizieren."'
FROM public.brandings b;