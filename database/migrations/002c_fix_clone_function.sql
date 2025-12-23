-- Fix: Update clone_sample_template to accept user_id as parameter
-- The SECURITY DEFINER function has issues with auth.uid() context
-- Run this in Supabase SQL Editor

-- Drop and recreate the function with user_id parameter
CREATE OR REPLACE FUNCTION clone_sample_template(
    p_sample_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_sample RECORD;
    v_new_template_id UUID;
    v_folder JSONB;
    v_folder_mapping JSONB := '{}'::jsonb;
    v_new_id UUID;
    v_actual_user_id UUID;
BEGIN
    -- Use provided user_id or fall back to auth.uid()
    v_actual_user_id := COALESCE(p_user_id, auth.uid());

    IF v_actual_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;

    -- Get sample template
    SELECT * INTO v_sample
    FROM public.sample_templates
    WHERE id = p_sample_id;

    IF v_sample IS NULL THEN
        RAISE EXCEPTION 'Sample template not found';
    END IF;

    -- Create new template with explicit user_id
    INSERT INTO public.templates (
        owner_id, name, description, icon_type, color
    ) VALUES (
        v_actual_user_id,
        v_sample.name,
        v_sample.description,
        v_sample.icon_type,
        v_sample.color
    )
    RETURNING id INTO v_new_template_id;

    -- Create folders from sample structure
    FOR v_folder IN SELECT * FROM jsonb_array_elements(v_sample.folder_structure)
    LOOP
        INSERT INTO public.folders (
            template_id,
            parent_id,
            name,
            folder_type,
            sort_order,
            include_files,
            metadata
        ) VALUES (
            v_new_template_id,
            CASE
                WHEN v_folder->>'parent_id' IS NULL THEN NULL
                ELSE (v_folder_mapping->>(v_folder->>'parent_id'))::uuid
            END,
            v_folder->>'name',
            COALESCE(v_folder->>'folder_type', 'default'),
            COALESCE((v_folder->>'sort_order')::integer, 0),
            COALESCE(v_folder->'include_files', '[]'::jsonb),
            COALESCE(v_folder->'metadata', '{}'::jsonb)
        )
        RETURNING id INTO v_new_id;

        v_folder_mapping := v_folder_mapping || jsonb_build_object(v_folder->>'id', v_new_id);
    END LOOP;

    -- Increment popularity
    UPDATE public.sample_templates
    SET popularity = popularity + 1
    WHERE id = p_sample_id;

    -- Create initial version (skip if create_template_version also has issues)
    -- PERFORM create_template_version(v_new_template_id, 'v1.0', 'Initial version from sample: ' || v_sample.name);

    RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.clone_sample_template(UUID, UUID) TO authenticated;
