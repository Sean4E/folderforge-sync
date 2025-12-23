-- Grant execute permissions on version control and sample template functions
-- Run this in the Supabase SQL Editor after the main migration

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_template_version(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_template_version(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_sample_template(UUID) TO authenticated;
