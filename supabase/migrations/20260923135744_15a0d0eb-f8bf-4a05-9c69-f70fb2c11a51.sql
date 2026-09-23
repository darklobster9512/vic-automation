UPDATE public.interview_appointments
SET slot_index = 2,
    appointment_time = appointment_time + interval '10 minutes'
WHERE id IN (
  'adbce4c2-c00a-4405-baba-4491a8f285e8',
  '1db51838-8e25-4b21-8340-a939cf5e3315',
  '87d60414-f263-40b0-9bed-93b26a8b3d9c',
  '4d78f11f-edf1-4575-a199-590978017e53',
  '6ace4cf0-a522-4422-a14f-ccea17b33faa',
  '8d8120d8-b610-4cb6-8b23-41e614b6fef1',
  'bfee4ec5-fc31-4a76-932c-00e51148c481',
  'b293bec4-88f8-4783-93d1-c26134700689',
  '5b2b991b-a31a-480d-952d-cf3fe7d900ad'
);