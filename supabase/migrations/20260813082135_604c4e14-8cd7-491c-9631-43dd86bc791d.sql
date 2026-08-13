INSERT INTO public.sms_templates (event_type, label, message)
SELECT 'website_wieder_erreichbar', 'Website wieder erreichbar', 'Hallo {vorname}, wir entschuldigen uns fuer die technischen Probleme heute Morgen. Unsere Website ist wieder erreichbar: {link}'
WHERE NOT EXISTS (SELECT 1 FROM public.sms_templates WHERE event_type = 'website_wieder_erreichbar');