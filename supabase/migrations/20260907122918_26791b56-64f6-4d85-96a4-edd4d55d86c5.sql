CREATE OR REPLACE FUNCTION public.fw_calendar_branding_ids(_branding_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unnest(
    CASE
      WHEN _branding_id IN (
        '086e5c75-5ae6-439d-8ff4-a3b63bdaed3c'::uuid, -- LIMEX
        '7acd3258-1288-4778-930c-35d60f4f46ec'::uuid, -- Codebricks
        'd1d0efc1-884c-43f9-af0a-82bb5899882d'::uuid, -- Vendis
        'f8cc2f90-9b89-41d6-ba41-94597773285b'::uuid, -- Topscale
        '2de5a23d-72e1-48bc-bc0f-9e8c11f3181c'::uuid, -- PointView
        'c8b88da1-4d0e-468d-ac60-9206aae888ac'::uuid  -- Softex
      )
        THEN ARRAY[
          '086e5c75-5ae6-439d-8ff4-a3b63bdaed3c'::uuid,
          '7acd3258-1288-4778-930c-35d60f4f46ec'::uuid,
          'd1d0efc1-884c-43f9-af0a-82bb5899882d'::uuid,
          'f8cc2f90-9b89-41d6-ba41-94597773285b'::uuid,
          '2de5a23d-72e1-48bc-bc0f-9e8c11f3181c'::uuid,
          'c8b88da1-4d0e-468d-ac60-9206aae888ac'::uuid
        ]
      ELSE ARRAY[_branding_id]
    END
  );
$$;