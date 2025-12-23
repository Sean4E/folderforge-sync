// ============================================================================
// FOLDERFORGE SYNC - SUPABASE CLIENT & TYPES
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  name: string;
  device_type: 'desktop' | 'laptop' | 'mobile';
  platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'web' | null;
  default_path: string | null;
  device_token: string | null;
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  icon_type: string;
  color: string;
  folder_count: number;
  max_depth: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: Profile;
  collaborators?: TemplateCollaborator[];
}

export interface Folder {
  id: string;
  template_id: string;
  parent_id: string | null;
  name: string;
  folder_type: 'default' | 'code' | 'docs' | 'media' | 'assets' | 'archive' | 'data';
  sort_order: number;
  include_files: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Client-side fields for tree rendering
  children?: Folder[];
  expanded?: boolean;
}

export interface TemplateShare {
  id: string;
  template_id: string;
  share_code: string;
  created_by: string;
  allow_updates: boolean;
  expires_at: string | null;
  access_count: number;
  created_at: string;
}

export interface TemplateCollaborator {
  id: string;
  template_id: string;
  user_id: string;
  role: 'viewer' | 'editor' | 'admin';
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  // Joined
  user?: Profile;
}

export interface CollaborationInvite {
  id: string;
  template_id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  invited_by: string;
  invite_code: string;
  expires_at: string;
  created_at: string;
}

export interface TemplateApplication {
  id: string;
  template_id: string | null;
  device_id: string | null;
  user_id: string;
  target_path: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  folders_created: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SyncQueueItem {
  id: string;
  user_id: string;
  device_id: string | null;
  action: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  created_at: string;
  processed_at: string | null;
}

// ============================================================================
// FOLDER TREE HELPERS
// ============================================================================

/**
 * Convert flat folder list to nested tree structure
 */
export function buildFolderTree(folders: Folder[]): Folder[] {
  const folderMap = new Map<string, Folder>();
  const roots: Folder[] = [];

  // First pass: create map and initialize children
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [], expanded: false });
  });

  // Second pass: build tree
  folders.forEach(folder => {
    const node = folderMap.get(folder.id)!;
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // Sort children by sort_order
  const sortChildren = (nodes: Folder[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach(node => {
      if (node.children?.length) {
        sortChildren(node.children);
      }
    });
  };
  sortChildren(roots);

  return roots;
}

/**
 * Flatten tree back to list for database operations
 */
export function flattenFolderTree(tree: Folder[], parentId: string | null = null): Omit<Folder, 'children' | 'expanded'>[] {
  const result: Omit<Folder, 'children' | 'expanded'>[] = [];
  
  tree.forEach((node, index) => {
    const { children, expanded, ...folder } = node;
    result.push({
      ...folder,
      parent_id: parentId,
      sort_order: index,
    });
    
    if (children?.length) {
      result.push(...flattenFolderTree(children, node.id));
    }
  });
  
  return result;
}

// ============================================================================
// DATABASE TYPES FOR SUPABASE
// ============================================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      devices: {
        Row: Device;
        Insert: Omit<Device, 'id' | 'created_at' | 'updated_at' | 'last_seen_at'>;
        Update: Partial<Omit<Device, 'id' | 'created_at'>>;
      };
      templates: {
        Row: Template;
        Insert: Omit<Template, 'id' | 'created_at' | 'updated_at' | 'folder_count' | 'max_depth'>;
        Update: Partial<Omit<Template, 'id' | 'created_at' | 'folder_count' | 'max_depth'>>;
      };
      folders: {
        Row: Folder;
        Insert: Omit<Folder, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Folder, 'id' | 'created_at'>>;
      };
      template_shares: {
        Row: TemplateShare;
        Insert: Omit<TemplateShare, 'id' | 'created_at' | 'access_count'>;
        Update: Partial<Omit<TemplateShare, 'id' | 'created_at'>>;
      };
      template_collaborators: {
        Row: TemplateCollaborator;
        Insert: Omit<TemplateCollaborator, 'id' | 'invited_at'>;
        Update: Partial<Omit<TemplateCollaborator, 'id' | 'invited_at'>>;
      };
      collaboration_invites: {
        Row: CollaborationInvite;
        Insert: Omit<CollaborationInvite, 'id' | 'created_at'>;
        Update: Partial<Omit<CollaborationInvite, 'id' | 'created_at'>>;
      };
      template_applications: {
        Row: TemplateApplication;
        Insert: Omit<TemplateApplication, 'id' | 'created_at' | 'folders_created'>;
        Update: Partial<Omit<TemplateApplication, 'id' | 'created_at'>>;
      };
      sync_queue: {
        Row: SyncQueueItem;
        Insert: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count'>;
        Update: Partial<Omit<SyncQueueItem, 'id' | 'created_at'>>;
      };
    };
    Functions: {
      clone_template: {
        Args: { source_template_id: string; new_owner_id: string };
        Returns: string;
      };
      generate_share_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
};
