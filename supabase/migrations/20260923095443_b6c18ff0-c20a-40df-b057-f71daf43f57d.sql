INSERT INTO public.orders (
  order_number, title, provider, reward, is_placeholder, appstore_url, playstore_url,
  project_goal, review_questions, created_at, created_by, branding_id, description,
  order_type, estimated_hours, is_starter_job, work_steps, required_attachments,
  is_videochat, is_starred
)
SELECT
  order_number, title, provider, reward, is_placeholder, appstore_url, playstore_url,
  project_goal, review_questions, now(), created_by, 'd212b0e8-98e1-4727-b370-b850275a7dd0'::uuid, description,
  order_type, estimated_hours, is_starter_job, work_steps, required_attachments,
  is_videochat, is_starred
FROM public.orders
WHERE branding_id = 'c8b2972b-64c6-467a-b8b7-00984727bbd6'::uuid;