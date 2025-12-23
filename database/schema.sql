-- ============================================================================
-- FOLDERFORGE SYNC - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Run this in your Supabase SQL Editor to set up the complete database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users Profile (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices registered to users
CREATE TABLE public.devices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    device_type TEXT CHECK (device_type IN ('desktop', 'laptop', 'mobile')) DEFAULT 'desktop',
    platform TEXT CHECK (platform IN ('windows', 'macos', 'linux', 'ios', 'android', 'web')),
    default_path TEXT,
    device_token TEXT UNIQUE, -- For authenticating the desktop agent
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Folder Templates
CREATE TABLE public.templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon_type TEXT DEFAULT 'default',
    color TEXT DEFAULT 'amber',
    folder_count INTEGER DEFAULT 0,
    max_depth INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false, -- For template marketplace later
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Folder Structure (the actual folder tree within a template)
CREATE TABLE public.folders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE, -- NULL for root folders
    name TEXT NOT NULL,
    folder_type TEXT DEFAULT 'default', -- default, code, docs, media, assets, archive, data
    sort_order INTEGER DEFAULT 0,
    include_files JSONB DEFAULT '[]'::jsonb, -- Files to create in this folder
    metadata JSONB DEFAULT '{}'::jsonb, -- Any additional properties
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Sharing (Copy Mode)
CREATE TABLE public.template_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    share_code TEXT UNIQUE NOT NULL, -- Short shareable code
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    allow_updates BOOLEAN DEFAULT false, -- If true, recipient sees owner's updates
    expires_at TIMESTAMPTZ, -- Optional expiration
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Collaborators (Collaborate Mode)
CREATE TABLE public.template_collaborators (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('viewer', 'editor', 'admin')) DEFAULT 'editor',
    invited_by UUID REFERENCES public.profiles(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(template_id, user_id)
);

-- Collaboration Invites (pending invites by email)
CREATE TABLE public.collaboration_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('viewer', 'editor', 'admin')) DEFAULT 'editor',
    invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Applications (history of where templates were applied)
CREATE TABLE public.template_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_path TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    folders_created INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Sync Queue (for offline-first sync)
CREATE TABLE public.sync_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'create_template', 'update_template', 'delete_folder', etc.
    payload JSONB NOT NULL,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_devices_user_id ON public.devices(user_id);
CREATE INDEX idx_devices_token ON public.devices(device_token);
CREATE INDEX idx_templates_owner_id ON public.templates(owner_id);
CREATE INDEX idx_folders_template_id ON public.folders(template_id);
CREATE INDEX idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX idx_template_shares_code ON public.template_shares(share_code);
CREATE INDEX idx_collaborators_template ON public.template_collaborators(template_id);
CREATE INDEX idx_collaborators_user ON public.template_collaborators(user_id);
CREATE INDEX idx_sync_queue_user_pending ON public.sync_queue(user_id, status) WHERE status = 'pending';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Devices: Users can only access their own devices
CREATE POLICY "Users can view own devices" ON public.devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON public.devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON public.devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON public.devices
    FOR DELETE USING (auth.uid() = user_id);

-- Templates: Owner + Collaborators can access
CREATE POLICY "Users can view own and collaborated templates" ON public.templates
    FOR SELECT USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.template_collaborators
            WHERE template_id = templates.id
            AND user_id = auth.uid()
            AND accepted_at IS NOT NULL
        )
        OR is_public = true
    );

CREATE POLICY "Users can insert own templates" ON public.templates
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update templates" ON public.templates
    FOR UPDATE USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.template_collaborators
            WHERE template_id = templates.id
            AND user_id = auth.uid()
            AND role IN ('editor', 'admin')
            AND accepted_at IS NOT NULL
        )
    );

CREATE POLICY "Only owners can delete templates" ON public.templates
    FOR DELETE USING (auth.uid() = owner_id);

-- Folders: Access based on template access
CREATE POLICY "Users can view folders of accessible templates" ON public.folders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.templates
            WHERE id = folders.template_id
            AND (
                owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.template_collaborators
                    WHERE template_id = templates.id
                    AND user_id = auth.uid()
                    AND accepted_at IS NOT NULL
                )
                OR is_public = true
            )
        )
    );

CREATE POLICY "Users can modify folders of editable templates" ON public.folders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.templates
            WHERE id = folders.template_id
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

-- Template Shares: Owner can manage, anyone can view for accepting
CREATE POLICY "Owners can manage shares" ON public.template_shares
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Anyone can view shares by code" ON public.template_shares
    FOR SELECT USING (true);

-- Collaborators: Template owners can manage, users can see their own
CREATE POLICY "View collaborators on accessible templates" ON public.template_collaborators
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.templates
            WHERE id = template_collaborators.template_id
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners and admins can manage collaborators" ON public.template_collaborators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.templates
            WHERE id = template_collaborators.template_id
            AND owner_id = auth.uid()
        )
        OR (
            auth.uid() = user_id -- Users can update their own (e.g., accept invite)
        )
    );

-- Collaboration Invites
CREATE POLICY "Inviters can manage invites" ON public.collaboration_invites
    FOR ALL USING (auth.uid() = invited_by);

CREATE POLICY "Anyone can view invites by code" ON public.collaboration_invites
    FOR SELECT USING (true);

-- Template Applications: Users see their own
CREATE POLICY "Users can view own applications" ON public.template_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" ON public.template_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" ON public.template_applications
    FOR UPDATE USING (auth.uid() = user_id);

-- Sync Queue: Users manage their own
CREATE POLICY "Users can manage own sync queue" ON public.sync_queue
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update template folder count and depth
CREATE OR REPLACE FUNCTION update_template_stats()
RETURNS TRIGGER AS $$
DECLARE
    template_uuid UUID;
    folder_count_val INTEGER;
    max_depth_val INTEGER;
BEGIN
    -- Get the template_id from either NEW or OLD
    template_uuid := COALESCE(NEW.template_id, OLD.template_id);

    -- Count folders
    SELECT COUNT(*) INTO folder_count_val
    FROM public.folders
    WHERE template_id = template_uuid;

    -- Calculate max depth using recursive CTE
    WITH RECURSIVE folder_depth AS (
        SELECT id, parent_id, 1 as depth
        FROM public.folders
        WHERE template_id = template_uuid AND parent_id IS NULL

        UNION ALL

        SELECT f.id, f.parent_id, fd.depth + 1
        FROM public.folders f
        JOIN folder_depth fd ON f.parent_id = fd.id
        WHERE f.template_id = template_uuid
    )
    SELECT COALESCE(MAX(depth), 0) INTO max_depth_val FROM folder_depth;

    -- Update template
    UPDATE public.templates
    SET folder_count = folder_count_val, max_depth = max_depth_val
    WHERE id = template_uuid;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_stats_on_folder_change
    AFTER INSERT OR UPDATE OR DELETE ON public.folders
    FOR EACH ROW EXECUTE FUNCTION update_template_stats();

-- Generate short share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Clone template for share recipients
CREATE OR REPLACE FUNCTION clone_template(source_template_id UUID, new_owner_id UUID)
RETURNS UUID AS $$
DECLARE
    new_template_id UUID;
    folder_mapping JSONB := '{}'::jsonb;
    source_folder RECORD;
    new_folder_id UUID;
BEGIN
    -- Create new template
    INSERT INTO public.templates (owner_id, name, description, icon_type, color)
    SELECT new_owner_id, name || ' (Copy)', description, icon_type, color
    FROM public.templates
    WHERE id = source_template_id
    RETURNING id INTO new_template_id;

    -- Clone folders (handle hierarchy by processing NULL parents first)
    FOR source_folder IN
        WITH RECURSIVE ordered_folders AS (
            SELECT *, 0 as level
            FROM public.folders
            WHERE template_id = source_template_id AND parent_id IS NULL

            UNION ALL

            SELECT f.*, of.level + 1
            FROM public.folders f
            JOIN ordered_folders of ON f.parent_id = of.id
            WHERE f.template_id = source_template_id
        )
        SELECT * FROM ordered_folders ORDER BY level
    LOOP
        INSERT INTO public.folders (template_id, parent_id, name, folder_type, sort_order, include_files, metadata)
        VALUES (
            new_template_id,
            CASE
                WHEN source_folder.parent_id IS NULL THEN NULL
                ELSE (folder_mapping->>source_folder.parent_id::text)::uuid
            END,
            source_folder.name,
            source_folder.folder_type,
            source_folder.sort_order,
            source_folder.include_files,
            source_folder.metadata
        )
        RETURNING id INTO new_folder_id;

        folder_mapping := folder_mapping || jsonb_build_object(source_folder.id::text, new_folder_id);
    END LOOP;

    RETURN new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.template_collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_queue;
