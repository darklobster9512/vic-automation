ALTER TABLE public.brandings ADD COLUMN IF NOT EXISTS meta_pixel_id text;

UPDATE public.brandings
SET meta_pixel_id = '1076768121483815'
WHERE company_name ILIKE '%VONA%';

-- Nur zur Sicherheit: falls mehrere VONA-Einträge existieren, alle mit Pixel-ID versehen
UPDATE public.brandings
SET meta_pixel_id = '1076768121483815'
WHERE domain ILIKE '%vona%' OR subdomain_prefix ILIKE '%vona%';