UPDATE public.applications a SET branding_id = '086e5c75-5ae6-439d-8ff4-a3b63bdaed3c'
WHERE a.status = 'neu' AND a.email IS NOT NULL
AND a.branding_id IN ('7acd3258-1288-4778-930c-35d60f4f46ec','d1d0efc1-884c-43f9-af0a-82bb5899882d')
AND EXISTS (SELECT 1 FROM public.applications b WHERE lower(b.email)=lower(a.email) AND b.branding_id IS DISTINCT FROM a.branding_id);