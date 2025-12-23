-- ============================================================================
-- FOLDERFORGE SYNC - VERSION CONTROL & SAMPLE TEMPLATES
-- ============================================================================
-- Run this migration after the initial schema.sql

-- ============================================================================
-- VERSION CONTROL TABLES
-- ============================================================================

-- Template Versions (snapshots of template + folder structure)
CREATE TABLE IF NOT EXISTS public.template_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    version_name TEXT, -- e.g., "v1.0", "Initial Release", "Added src folder"
    description TEXT,
    snapshot JSONB NOT NULL, -- Complete folder structure at this version
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_published BOOLEAN DEFAULT false, -- Published versions are visible to collaborators
    UNIQUE(template_id, version_number)
);

-- Version Changes Log (granular change tracking)
CREATE TABLE IF NOT EXISTS public.template_changes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    version_id UUID REFERENCES public.template_versions(id) ON DELETE SET NULL,
    change_type TEXT CHECK (change_type IN ('folder_add', 'folder_rename', 'folder_delete', 'folder_move', 'folder_type_change', 'template_update')) NOT NULL,
    folder_id UUID,
    previous_value JSONB,
    new_value JSONB,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL -- Track which device made the change
);

-- Sample Templates (system-provided templates)
CREATE TABLE IF NOT EXISTS public.sample_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'web', 'mobile', 'backend', 'devops', 'design', 'general'
    icon_type TEXT DEFAULT 'default',
    color TEXT DEFAULT 'amber',
    folder_structure JSONB NOT NULL, -- Pre-defined folder structure
    tags TEXT[] DEFAULT '{}',
    popularity INTEGER DEFAULT 0, -- Track how many times cloned
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_number ON public.template_versions(template_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_template_changes_template ON public.template_changes(template_id);
CREATE INDEX IF NOT EXISTS idx_template_changes_version ON public.template_changes(version_id);
CREATE INDEX IF NOT EXISTS idx_sample_templates_category ON public.sample_templates(category);
CREATE INDEX IF NOT EXISTS idx_sample_templates_featured ON public.sample_templates(is_featured) WHERE is_featured = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_templates ENABLE ROW LEVEL SECURITY;

-- Template Versions: Access based on template access
CREATE POLICY "Users can view versions of accessible templates" ON public.template_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.templates
            WHERE id = template_versions.template_id
            AND (
                owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.template_collaborators
                    WHERE template_id = templates.id
                    AND user_id = auth.uid()
                    AND accepted_at IS NOT NULL
                )
            )
        )
    );

CREATE POLICY "Users can create versions for editable templates" ON public.template_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.templates
            WHERE id = template_versions.template_id
            AND (
                owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.template_collaborators
                    WHERE template_id = templates.id
                    AND user_id = auth.uid()
                    AND role IN ('editor', 'admin')
                    AND accepted_at IS NOT NULL
                )
            )
        )
    );

-- Template Changes: Same as versions
CREATE POLICY "Users can view changes for accessible templates" ON public.template_changes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.templates
            WHERE id = template_changes.template_id
            AND (
                owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.template_collaborators
                    WHERE template_id = templates.id
                    AND user_id = auth.uid()
                    AND accepted_at IS NOT NULL
                )
            )
        )
    );

CREATE POLICY "Users can log changes for editable templates" ON public.template_changes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.templates
            WHERE id = template_changes.template_id
            AND (
                owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.template_collaborators
                    WHERE template_id = templates.id
                    AND user_id = auth.uid()
                    AND role IN ('editor', 'admin')
                    AND accepted_at IS NOT NULL
                )
            )
        )
    );

-- Sample Templates: Everyone can read
CREATE POLICY "Sample templates are viewable by everyone" ON public.sample_templates
    FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Create a new version snapshot
CREATE OR REPLACE FUNCTION create_template_version(
    p_template_id UUID,
    p_version_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_version_number INTEGER;
    v_version_id UUID;
    v_snapshot JSONB;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
    FROM public.template_versions
    WHERE template_id = p_template_id;

    -- Build snapshot of current folder structure
    WITH RECURSIVE folder_tree AS (
        SELECT
            id, parent_id, name, folder_type, sort_order, include_files, metadata,
            0 as depth,
            ARRAY[sort_order] as path
        FROM public.folders
        WHERE template_id = p_template_id AND parent_id IS NULL

        UNION ALL

        SELECT
            f.id, f.parent_id, f.name, f.folder_type, f.sort_order, f.include_files, f.metadata,
            ft.depth + 1,
            ft.path || f.sort_order
        FROM public.folders f
        JOIN folder_tree ft ON f.parent_id = ft.id
        WHERE f.template_id = p_template_id
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'parent_id', parent_id,
            'name', name,
            'folder_type', folder_type,
            'sort_order', sort_order,
            'include_files', include_files,
            'metadata', metadata
        ) ORDER BY path
    ) INTO v_snapshot
    FROM folder_tree;

    -- Create version record
    INSERT INTO public.template_versions (
        template_id, version_number, version_name, description, snapshot, created_by
    ) VALUES (
        p_template_id,
        v_version_number,
        COALESCE(p_version_name, 'v' || v_version_number || '.0'),
        p_description,
        COALESCE(v_snapshot, '[]'::jsonb),
        auth.uid()
    )
    RETURNING id INTO v_version_id;

    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore template to a specific version
CREATE OR REPLACE FUNCTION restore_template_version(
    p_template_id UUID,
    p_version_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_snapshot JSONB;
    v_folder JSONB;
    v_folder_mapping JSONB := '{}'::jsonb;
    v_new_id UUID;
BEGIN
    -- Get the snapshot
    SELECT snapshot INTO v_snapshot
    FROM public.template_versions
    WHERE id = p_version_id AND template_id = p_template_id;

    IF v_snapshot IS NULL THEN
        RETURN false;
    END IF;

    -- Delete all current folders
    DELETE FROM public.folders WHERE template_id = p_template_id;

    -- Recreate folders from snapshot (process in order to handle parent references)
    FOR v_folder IN SELECT * FROM jsonb_array_elements(v_snapshot)
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
            p_template_id,
            CASE
                WHEN v_folder->>'parent_id' IS NULL THEN NULL
                ELSE (v_folder_mapping->>(v_folder->>'parent_id'))::uuid
            END,
            v_folder->>'name',
            v_folder->>'folder_type',
            (v_folder->>'sort_order')::integer,
            COALESCE(v_folder->'include_files', '[]'::jsonb),
            COALESCE(v_folder->'metadata', '{}'::jsonb)
        )
        RETURNING id INTO v_new_id;

        -- Map old ID to new ID for parent references
        v_folder_mapping := v_folder_mapping || jsonb_build_object(v_folder->>'id', v_new_id);
    END LOOP;

    -- Log the restore as a change
    INSERT INTO public.template_changes (
        template_id, version_id, change_type, new_value, changed_by
    ) VALUES (
        p_template_id, p_version_id, 'template_update',
        jsonb_build_object('action', 'restore', 'version_id', p_version_id),
        auth.uid()
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clone a sample template to user's account
CREATE OR REPLACE FUNCTION clone_sample_template(
    p_sample_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_sample RECORD;
    v_new_template_id UUID;
    v_folder JSONB;
    v_folder_mapping JSONB := '{}'::jsonb;
    v_new_id UUID;
BEGIN
    -- Get sample template
    SELECT * INTO v_sample
    FROM public.sample_templates
    WHERE id = p_sample_id;

    IF v_sample IS NULL THEN
        RAISE EXCEPTION 'Sample template not found';
    END IF;

    -- Create new template
    INSERT INTO public.templates (
        owner_id, name, description, icon_type, color
    ) VALUES (
        auth.uid(),
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

    -- Create initial version
    PERFORM create_template_version(v_new_template_id, 'v1.0', 'Initial version from sample: ' || v_sample.name);

    RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE TEMPLATES DATA
-- ============================================================================

-- Web Development - React Project
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, is_featured, folder_structure)
VALUES (
    'React Project',
    'Modern React application structure with TypeScript, components, hooks, and testing setup',
    'web',
    'code',
    'blue',
    ARRAY['react', 'typescript', 'frontend', 'web'],
    true,
    '[
        {"id": "1", "parent_id": null, "name": "src", "folder_type": "code", "sort_order": 0},
        {"id": "2", "parent_id": "1", "name": "components", "folder_type": "code", "sort_order": 0},
        {"id": "3", "parent_id": "2", "name": "ui", "folder_type": "code", "sort_order": 0},
        {"id": "4", "parent_id": "2", "name": "layout", "folder_type": "code", "sort_order": 1},
        {"id": "5", "parent_id": "2", "name": "forms", "folder_type": "code", "sort_order": 2},
        {"id": "6", "parent_id": "1", "name": "hooks", "folder_type": "code", "sort_order": 1},
        {"id": "7", "parent_id": "1", "name": "lib", "folder_type": "code", "sort_order": 2},
        {"id": "8", "parent_id": "1", "name": "pages", "folder_type": "code", "sort_order": 3},
        {"id": "9", "parent_id": "1", "name": "styles", "folder_type": "default", "sort_order": 4},
        {"id": "10", "parent_id": "1", "name": "types", "folder_type": "code", "sort_order": 5},
        {"id": "11", "parent_id": "1", "name": "utils", "folder_type": "code", "sort_order": 6},
        {"id": "12", "parent_id": "1", "name": "context", "folder_type": "code", "sort_order": 7},
        {"id": "13", "parent_id": "1", "name": "services", "folder_type": "code", "sort_order": 8},
        {"id": "14", "parent_id": null, "name": "public", "folder_type": "media", "sort_order": 1},
        {"id": "15", "parent_id": "14", "name": "images", "folder_type": "media", "sort_order": 0},
        {"id": "16", "parent_id": "14", "name": "fonts", "folder_type": "default", "sort_order": 1},
        {"id": "17", "parent_id": null, "name": "tests", "folder_type": "code", "sort_order": 2},
        {"id": "18", "parent_id": "17", "name": "unit", "folder_type": "code", "sort_order": 0},
        {"id": "19", "parent_id": "17", "name": "integration", "folder_type": "code", "sort_order": 1},
        {"id": "20", "parent_id": "17", "name": "e2e", "folder_type": "code", "sort_order": 2}
    ]'::jsonb
);

-- Web Development - Next.js Full Stack
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, is_featured, folder_structure)
VALUES (
    'Next.js Full Stack',
    'Full-stack Next.js 14 project with App Router, API routes, and database integration',
    'web',
    'code',
    'emerald',
    ARRAY['nextjs', 'typescript', 'fullstack', 'react'],
    true,
    '[
        {"id": "1", "parent_id": null, "name": "app", "folder_type": "code", "sort_order": 0},
        {"id": "2", "parent_id": "1", "name": "(auth)", "folder_type": "code", "sort_order": 0},
        {"id": "3", "parent_id": "2", "name": "login", "folder_type": "code", "sort_order": 0},
        {"id": "4", "parent_id": "2", "name": "register", "folder_type": "code", "sort_order": 1},
        {"id": "5", "parent_id": "1", "name": "(dashboard)", "folder_type": "code", "sort_order": 1},
        {"id": "6", "parent_id": "1", "name": "api", "folder_type": "code", "sort_order": 2},
        {"id": "7", "parent_id": "6", "name": "auth", "folder_type": "code", "sort_order": 0},
        {"id": "8", "parent_id": "6", "name": "users", "folder_type": "code", "sort_order": 1},
        {"id": "9", "parent_id": null, "name": "components", "folder_type": "code", "sort_order": 1},
        {"id": "10", "parent_id": "9", "name": "ui", "folder_type": "code", "sort_order": 0},
        {"id": "11", "parent_id": "9", "name": "forms", "folder_type": "code", "sort_order": 1},
        {"id": "12", "parent_id": "9", "name": "layout", "folder_type": "code", "sort_order": 2},
        {"id": "13", "parent_id": null, "name": "lib", "folder_type": "code", "sort_order": 2},
        {"id": "14", "parent_id": "13", "name": "db", "folder_type": "code", "sort_order": 0},
        {"id": "15", "parent_id": "13", "name": "auth", "folder_type": "code", "sort_order": 1},
        {"id": "16", "parent_id": "13", "name": "utils", "folder_type": "code", "sort_order": 2},
        {"id": "17", "parent_id": null, "name": "types", "folder_type": "code", "sort_order": 3},
        {"id": "18", "parent_id": null, "name": "public", "folder_type": "media", "sort_order": 4},
        {"id": "19", "parent_id": null, "name": "prisma", "folder_type": "data", "sort_order": 5}
    ]'::jsonb
);

-- Backend - Node.js API
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, is_featured, folder_structure)
VALUES (
    'Node.js REST API',
    'Express.js REST API with controllers, services, middleware, and database layers',
    'backend',
    'code',
    'amber',
    ARRAY['nodejs', 'express', 'api', 'backend'],
    true,
    '[
        {"id": "1", "parent_id": null, "name": "src", "folder_type": "code", "sort_order": 0},
        {"id": "2", "parent_id": "1", "name": "controllers", "folder_type": "code", "sort_order": 0},
        {"id": "3", "parent_id": "1", "name": "services", "folder_type": "code", "sort_order": 1},
        {"id": "4", "parent_id": "1", "name": "models", "folder_type": "code", "sort_order": 2},
        {"id": "5", "parent_id": "1", "name": "routes", "folder_type": "code", "sort_order": 3},
        {"id": "6", "parent_id": "1", "name": "middleware", "folder_type": "code", "sort_order": 4},
        {"id": "7", "parent_id": "1", "name": "utils", "folder_type": "code", "sort_order": 5},
        {"id": "8", "parent_id": "1", "name": "config", "folder_type": "code", "sort_order": 6},
        {"id": "9", "parent_id": "1", "name": "validators", "folder_type": "code", "sort_order": 7},
        {"id": "10", "parent_id": "1", "name": "types", "folder_type": "code", "sort_order": 8},
        {"id": "11", "parent_id": null, "name": "tests", "folder_type": "code", "sort_order": 1},
        {"id": "12", "parent_id": "11", "name": "unit", "folder_type": "code", "sort_order": 0},
        {"id": "13", "parent_id": "11", "name": "integration", "folder_type": "code", "sort_order": 1},
        {"id": "14", "parent_id": null, "name": "docs", "folder_type": "docs", "sort_order": 2},
        {"id": "15", "parent_id": "14", "name": "api", "folder_type": "docs", "sort_order": 0},
        {"id": "16", "parent_id": null, "name": "scripts", "folder_type": "code", "sort_order": 3}
    ]'::jsonb
);

-- Python Backend
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, folder_structure)
VALUES (
    'Python FastAPI',
    'FastAPI project structure with routers, models, schemas, and async database setup',
    'backend',
    'code',
    'cyan',
    ARRAY['python', 'fastapi', 'api', 'backend'],
    '[
        {"id": "1", "parent_id": null, "name": "app", "folder_type": "code", "sort_order": 0},
        {"id": "2", "parent_id": "1", "name": "api", "folder_type": "code", "sort_order": 0},
        {"id": "3", "parent_id": "2", "name": "v1", "folder_type": "code", "sort_order": 0},
        {"id": "4", "parent_id": "3", "name": "endpoints", "folder_type": "code", "sort_order": 0},
        {"id": "5", "parent_id": "1", "name": "core", "folder_type": "code", "sort_order": 1},
        {"id": "6", "parent_id": "1", "name": "models", "folder_type": "code", "sort_order": 2},
        {"id": "7", "parent_id": "1", "name": "schemas", "folder_type": "code", "sort_order": 3},
        {"id": "8", "parent_id": "1", "name": "services", "folder_type": "code", "sort_order": 4},
        {"id": "9", "parent_id": "1", "name": "db", "folder_type": "data", "sort_order": 5},
        {"id": "10", "parent_id": "9", "name": "migrations", "folder_type": "data", "sort_order": 0},
        {"id": "11", "parent_id": "1", "name": "utils", "folder_type": "code", "sort_order": 6},
        {"id": "12", "parent_id": null, "name": "tests", "folder_type": "code", "sort_order": 1},
        {"id": "13", "parent_id": null, "name": "scripts", "folder_type": "code", "sort_order": 2},
        {"id": "14", "parent_id": null, "name": "docs", "folder_type": "docs", "sort_order": 3}
    ]'::jsonb
);

-- Mobile - React Native
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, is_featured, folder_structure)
VALUES (
    'React Native App',
    'Cross-platform mobile app structure with navigation, screens, and native modules',
    'mobile',
    'code',
    'purple',
    ARRAY['react-native', 'mobile', 'ios', 'android'],
    true,
    '[
        {"id": "1", "parent_id": null, "name": "src", "folder_type": "code", "sort_order": 0},
        {"id": "2", "parent_id": "1", "name": "screens", "folder_type": "code", "sort_order": 0},
        {"id": "3", "parent_id": "2", "name": "Auth", "folder_type": "code", "sort_order": 0},
        {"id": "4", "parent_id": "2", "name": "Home", "folder_type": "code", "sort_order": 1},
        {"id": "5", "parent_id": "2", "name": "Profile", "folder_type": "code", "sort_order": 2},
        {"id": "6", "parent_id": "1", "name": "components", "folder_type": "code", "sort_order": 1},
        {"id": "7", "parent_id": "6", "name": "common", "folder_type": "code", "sort_order": 0},
        {"id": "8", "parent_id": "6", "name": "forms", "folder_type": "code", "sort_order": 1},
        {"id": "9", "parent_id": "1", "name": "navigation", "folder_type": "code", "sort_order": 2},
        {"id": "10", "parent_id": "1", "name": "hooks", "folder_type": "code", "sort_order": 3},
        {"id": "11", "parent_id": "1", "name": "services", "folder_type": "code", "sort_order": 4},
        {"id": "12", "parent_id": "1", "name": "store", "folder_type": "code", "sort_order": 5},
        {"id": "13", "parent_id": "12", "name": "slices", "folder_type": "code", "sort_order": 0},
        {"id": "14", "parent_id": "1", "name": "utils", "folder_type": "code", "sort_order": 6},
        {"id": "15", "parent_id": "1", "name": "theme", "folder_type": "default", "sort_order": 7},
        {"id": "16", "parent_id": "1", "name": "assets", "folder_type": "media", "sort_order": 8},
        {"id": "17", "parent_id": "16", "name": "images", "folder_type": "media", "sort_order": 0},
        {"id": "18", "parent_id": "16", "name": "fonts", "folder_type": "default", "sort_order": 1},
        {"id": "19", "parent_id": null, "name": "android", "folder_type": "code", "sort_order": 1},
        {"id": "20", "parent_id": null, "name": "ios", "folder_type": "code", "sort_order": 2}
    ]'::jsonb
);

-- DevOps - Docker Project
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, folder_structure)
VALUES (
    'Docker Microservices',
    'Multi-service Docker Compose setup with nginx, services, and shared configurations',
    'devops',
    'default',
    'orange',
    ARRAY['docker', 'devops', 'microservices', 'containers'],
    '[
        {"id": "1", "parent_id": null, "name": "services", "folder_type": "code", "sort_order": 0},
        {"id": "2", "parent_id": "1", "name": "api", "folder_type": "code", "sort_order": 0},
        {"id": "3", "parent_id": "1", "name": "web", "folder_type": "code", "sort_order": 1},
        {"id": "4", "parent_id": "1", "name": "worker", "folder_type": "code", "sort_order": 2},
        {"id": "5", "parent_id": null, "name": "nginx", "folder_type": "default", "sort_order": 1},
        {"id": "6", "parent_id": "5", "name": "conf.d", "folder_type": "default", "sort_order": 0},
        {"id": "7", "parent_id": null, "name": "docker", "folder_type": "default", "sort_order": 2},
        {"id": "8", "parent_id": "7", "name": "dev", "folder_type": "default", "sort_order": 0},
        {"id": "9", "parent_id": "7", "name": "prod", "folder_type": "default", "sort_order": 1},
        {"id": "10", "parent_id": null, "name": "scripts", "folder_type": "code", "sort_order": 3},
        {"id": "11", "parent_id": null, "name": "config", "folder_type": "default", "sort_order": 4},
        {"id": "12", "parent_id": null, "name": "docs", "folder_type": "docs", "sort_order": 5}
    ]'::jsonb
);

-- Design - UI/UX Project
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, folder_structure)
VALUES (
    'Design System',
    'Organized structure for design assets, components, and documentation',
    'design',
    'default',
    'pink',
    ARRAY['design', 'ui', 'ux', 'figma'],
    '[
        {"id": "1", "parent_id": null, "name": "assets", "folder_type": "media", "sort_order": 0},
        {"id": "2", "parent_id": "1", "name": "icons", "folder_type": "media", "sort_order": 0},
        {"id": "3", "parent_id": "1", "name": "illustrations", "folder_type": "media", "sort_order": 1},
        {"id": "4", "parent_id": "1", "name": "photos", "folder_type": "media", "sort_order": 2},
        {"id": "5", "parent_id": "1", "name": "logos", "folder_type": "media", "sort_order": 3},
        {"id": "6", "parent_id": null, "name": "components", "folder_type": "default", "sort_order": 1},
        {"id": "7", "parent_id": "6", "name": "buttons", "folder_type": "default", "sort_order": 0},
        {"id": "8", "parent_id": "6", "name": "forms", "folder_type": "default", "sort_order": 1},
        {"id": "9", "parent_id": "6", "name": "cards", "folder_type": "default", "sort_order": 2},
        {"id": "10", "parent_id": "6", "name": "navigation", "folder_type": "default", "sort_order": 3},
        {"id": "11", "parent_id": null, "name": "pages", "folder_type": "default", "sort_order": 2},
        {"id": "12", "parent_id": "11", "name": "landing", "folder_type": "default", "sort_order": 0},
        {"id": "13", "parent_id": "11", "name": "dashboard", "folder_type": "default", "sort_order": 1},
        {"id": "14", "parent_id": "11", "name": "auth", "folder_type": "default", "sort_order": 2},
        {"id": "15", "parent_id": null, "name": "tokens", "folder_type": "default", "sort_order": 3},
        {"id": "16", "parent_id": "15", "name": "colors", "folder_type": "default", "sort_order": 0},
        {"id": "17", "parent_id": "15", "name": "typography", "folder_type": "default", "sort_order": 1},
        {"id": "18", "parent_id": "15", "name": "spacing", "folder_type": "default", "sort_order": 2},
        {"id": "19", "parent_id": null, "name": "documentation", "folder_type": "docs", "sort_order": 4},
        {"id": "20", "parent_id": null, "name": "exports", "folder_type": "media", "sort_order": 5}
    ]'::jsonb
);

-- General - Project Starter
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, is_featured, folder_structure)
VALUES (
    'General Project',
    'Universal project structure suitable for any type of project',
    'general',
    'default',
    'amber',
    ARRAY['general', 'starter', 'universal'],
    true,
    '[
        {"id": "1", "parent_id": null, "name": "src", "folder_type": "code", "sort_order": 0},
        {"id": "2", "parent_id": null, "name": "docs", "folder_type": "docs", "sort_order": 1},
        {"id": "3", "parent_id": null, "name": "tests", "folder_type": "code", "sort_order": 2},
        {"id": "4", "parent_id": null, "name": "assets", "folder_type": "media", "sort_order": 3},
        {"id": "5", "parent_id": "4", "name": "images", "folder_type": "media", "sort_order": 0},
        {"id": "6", "parent_id": "4", "name": "data", "folder_type": "data", "sort_order": 1},
        {"id": "7", "parent_id": null, "name": "config", "folder_type": "default", "sort_order": 4},
        {"id": "8", "parent_id": null, "name": "scripts", "folder_type": "code", "sort_order": 5},
        {"id": "9", "parent_id": null, "name": "build", "folder_type": "default", "sort_order": 6},
        {"id": "10", "parent_id": null, "name": "dist", "folder_type": "default", "sort_order": 7}
    ]'::jsonb
);

-- Monorepo Structure
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, folder_structure)
VALUES (
    'Monorepo (Turborepo)',
    'Monorepo setup with apps, packages, and shared tooling configuration',
    'web',
    'code',
    'cyan',
    ARRAY['monorepo', 'turborepo', 'pnpm', 'workspace'],
    '[
        {"id": "1", "parent_id": null, "name": "apps", "folder_type": "code", "sort_order": 0},
        {"id": "2", "parent_id": "1", "name": "web", "folder_type": "code", "sort_order": 0},
        {"id": "3", "parent_id": "1", "name": "docs", "folder_type": "code", "sort_order": 1},
        {"id": "4", "parent_id": "1", "name": "api", "folder_type": "code", "sort_order": 2},
        {"id": "5", "parent_id": null, "name": "packages", "folder_type": "code", "sort_order": 1},
        {"id": "6", "parent_id": "5", "name": "ui", "folder_type": "code", "sort_order": 0},
        {"id": "7", "parent_id": "5", "name": "config", "folder_type": "code", "sort_order": 1},
        {"id": "8", "parent_id": "5", "name": "utils", "folder_type": "code", "sort_order": 2},
        {"id": "9", "parent_id": "5", "name": "types", "folder_type": "code", "sort_order": 3},
        {"id": "10", "parent_id": null, "name": "tooling", "folder_type": "code", "sort_order": 2},
        {"id": "11", "parent_id": "10", "name": "eslint", "folder_type": "code", "sort_order": 0},
        {"id": "12", "parent_id": "10", "name": "typescript", "folder_type": "code", "sort_order": 1},
        {"id": "13", "parent_id": null, "name": "docs", "folder_type": "docs", "sort_order": 3},
        {"id": "14", "parent_id": null, "name": "scripts", "folder_type": "code", "sort_order": 4}
    ]'::jsonb
);

-- Game Development
INSERT INTO public.sample_templates (name, description, category, icon_type, color, tags, folder_structure)
VALUES (
    'Game Project (Unity/Godot)',
    'Game development project structure with scenes, scripts, assets, and prefabs',
    'general',
    'default',
    'purple',
    ARRAY['game', 'unity', 'godot', 'gamedev'],
    '[
        {"id": "1", "parent_id": null, "name": "Assets", "folder_type": "default", "sort_order": 0},
        {"id": "2", "parent_id": "1", "name": "Scenes", "folder_type": "default", "sort_order": 0},
        {"id": "3", "parent_id": "2", "name": "Levels", "folder_type": "default", "sort_order": 0},
        {"id": "4", "parent_id": "2", "name": "UI", "folder_type": "default", "sort_order": 1},
        {"id": "5", "parent_id": "1", "name": "Scripts", "folder_type": "code", "sort_order": 1},
        {"id": "6", "parent_id": "5", "name": "Player", "folder_type": "code", "sort_order": 0},
        {"id": "7", "parent_id": "5", "name": "Enemies", "folder_type": "code", "sort_order": 1},
        {"id": "8", "parent_id": "5", "name": "Managers", "folder_type": "code", "sort_order": 2},
        {"id": "9", "parent_id": "5", "name": "Utils", "folder_type": "code", "sort_order": 3},
        {"id": "10", "parent_id": "1", "name": "Prefabs", "folder_type": "default", "sort_order": 2},
        {"id": "11", "parent_id": "1", "name": "Materials", "folder_type": "default", "sort_order": 3},
        {"id": "12", "parent_id": "1", "name": "Textures", "folder_type": "media", "sort_order": 4},
        {"id": "13", "parent_id": "1", "name": "Models", "folder_type": "media", "sort_order": 5},
        {"id": "14", "parent_id": "1", "name": "Audio", "folder_type": "media", "sort_order": 6},
        {"id": "15", "parent_id": "14", "name": "Music", "folder_type": "media", "sort_order": 0},
        {"id": "16", "parent_id": "14", "name": "SFX", "folder_type": "media", "sort_order": 1},
        {"id": "17", "parent_id": "1", "name": "Animations", "folder_type": "default", "sort_order": 7},
        {"id": "18", "parent_id": "1", "name": "Fonts", "folder_type": "default", "sort_order": 8},
        {"id": "19", "parent_id": null, "name": "Docs", "folder_type": "docs", "sort_order": 1},
        {"id": "20", "parent_id": null, "name": "Builds", "folder_type": "default", "sort_order": 2}
    ]'::jsonb
);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.template_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.template_changes;
