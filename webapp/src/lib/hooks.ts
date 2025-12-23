// ============================================================================
// FOLDERFORGE SYNC - DATA HOOKS WITH REAL-TIME SYNC
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  supabase,
  Template,
  Folder,
  Device,
  TemplateShare,
  TemplateCollaborator,
  TemplateApplication,
  TemplateVersion,
  TemplateChange,
  SampleTemplate,
  buildFolderTree
} from './supabase';
import { useAuth } from './auth';

// ============================================================================
// TEMPLATES HOOK
// ============================================================================

interface UseTemplatesOptions {
  includeShared?: boolean;
  includeCollaborative?: boolean;
}

export function useTemplates(options: UseTemplatesOptions = {}) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First try simple query to check if templates table is accessible
      const { data: simpleData, error: simpleError } = await supabase
        .from('templates')
        .select('*')
        .order('updated_at', { ascending: false });

      console.log('Templates simple fetch:', { count: simpleData?.length, error: simpleError });

      if (simpleError) {
        console.error('Templates fetch error:', simpleError);
        throw simpleError;
      }

      // If simple query works, use the data with empty joins
      const templatesWithDefaults = (simpleData || []).map(t => ({
        ...t,
        owner: null,
        collaborators: []
      }));

      setTemplates(templatesWithDefaults as Template[]);
    } catch (err) {
      console.error('Templates fetch failed:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchTemplates();

    // Subscribe to template changes
    const channel = supabase
      .channel('templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'templates',
        },
        (payload: RealtimePostgresChangesPayload<Template>) => {
          console.log('Template change:', payload);

          if (payload.eventType === 'INSERT') {
            setTemplates(prev => [payload.new as Template, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTemplates(prev =>
              prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)
            );
          } else if (payload.eventType === 'DELETE') {
            setTemplates(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTemplates]);

  // Create template
  const createTemplate = async (data: { name: string; description?: string; color?: string; icon_type?: string }) => {
    if (!user) throw new Error('Not authenticated');

    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        owner_id: user.id,
        name: data.name,
        description: data.description || null,
        color: data.color || 'amber',
        icon_type: data.icon_type || 'default',
      })
      .select()
      .single();

    if (error) throw error;
    return template as Template;
  };

  // Update template
  const updateTemplate = async (id: string, updates: Partial<Template>) => {
    const { error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  // Delete template
  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  // Clone template
  const cloneTemplate = async (sourceId: string) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .rpc('clone_template', {
        source_template_id: sourceId,
        new_owner_id: user.id,
      });

    if (error) throw error;
    return data as string; // Returns new template ID
  };

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    cloneTemplate,
    refresh: fetchTemplates,
  };
}

// ============================================================================
// UNDO/REDO HOOK
// ============================================================================

interface UndoAction {
  type: 'add' | 'delete' | 'update' | 'move' | 'reorder' | 'batch';
  timestamp: number;
  // Data needed to undo/redo the action
  data: unknown;
}

interface UseUndoRedoReturn {
  canUndo: boolean;
  canRedo: boolean;
  pushAction: (action: Omit<UndoAction, 'timestamp'>) => void;
  undo: () => UndoAction | null;
  redo: () => UndoAction | null;
  clear: () => void;
}

export function useUndoRedo(maxHistory = 50): UseUndoRedoReturn {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  const pushAction = useCallback((action: Omit<UndoAction, 'timestamp'>) => {
    const fullAction: UndoAction = {
      ...action,
      timestamp: Date.now(),
    };
    setUndoStack(prev => [...prev.slice(-maxHistory + 1), fullAction]);
    setRedoStack([]); // Clear redo stack on new action
  }, [maxHistory]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return null;
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);
    return action;
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return null;
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);
    return action;
  }, [redoStack]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    pushAction,
    undo,
    redo,
    clear,
  };
}

// ============================================================================
// FOLDERS HOOK (for a specific template)
// ============================================================================

export function useFolders(templateId: string | null) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs for debouncing and preventing unnecessary fetches
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef<number>(0);
  const pendingUpdatesRef = useRef<Set<string>>(new Set());

  // Compute folder tree from folders - this ensures tree is always in sync
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  // Simple state updater - tree is computed automatically via useMemo
  const updateLocalFolders = useCallback((updater: (prev: Folder[]) => Folder[]) => {
    setFolders(updater);
  }, []);

  // Fetch folders with debouncing
  const fetchFolders = useCallback(async (force = false) => {
    if (!templateId) {
      setFolders([]);
      setLoading(false);
      return;
    }

    // Debounce rapid fetches (wait 150ms after last call)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 150) {
      // Schedule a fetch for later if not already scheduled
      if (!fetchTimeoutRef.current) {
        fetchTimeoutRef.current = setTimeout(() => {
          fetchTimeoutRef.current = null;
          fetchFolders(true);
        }, 150);
      }
      return;
    }

    lastFetchRef.current = now;

    try {
      // Only show loading on initial load
      setLoading(prev => prev);

      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');

      if (error) throw error;

      const folderList = data as Folder[];
      setFolders(folderList);
      pendingUpdatesRef.current.clear();
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  // Real-time subscription with debounced updates
  useEffect(() => {
    if (!templateId) return;

    fetchFolders(true);

    // Subscribe to folder changes for this template
    const channel = supabase
      .channel(`folders-${templateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `template_id=eq.${templateId}`,
        },
        (payload: RealtimePostgresChangesPayload<Folder>) => {
          // Skip if this is a change we initiated (optimistic update already applied)
          const recordId = (payload.new as Folder)?.id || (payload.old as { id?: string })?.id;
          if (recordId && pendingUpdatesRef.current.has(recordId)) {
            pendingUpdatesRef.current.delete(recordId);
            return;
          }

          // Debounced fetch for external changes
          fetchFolders();
        }
      )
      .subscribe();

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [templateId, fetchFolders]);

  // Add folder with optimistic update
  const addFolder = async (data: {
    name: string;
    parent_id?: string | null;
    folder_type?: string;
    sort_order?: number;
  }) => {
    if (!templateId) throw new Error('No template selected');

    // Calculate sort_order if not provided - place at end of siblings
    let sortOrder = data.sort_order;
    if (sortOrder === undefined) {
      const siblings = folders.filter(f => f.parent_id === (data.parent_id || null));
      sortOrder = siblings.length > 0
        ? Math.max(...siblings.map(s => s.sort_order)) + 1
        : 0;
    }

    // Create optimistic folder with temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticFolder: Folder = {
      id: tempId,
      template_id: templateId,
      name: data.name,
      parent_id: data.parent_id || null,
      folder_type: (data.folder_type || 'default') as Folder['folder_type'],
      sort_order: sortOrder,
      include_files: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    updateLocalFolders(prev => [...prev, optimisticFolder]);

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        template_id: templateId,
        name: data.name,
        parent_id: data.parent_id || null,
        folder_type: data.folder_type || 'default',
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      // Rollback on error
      updateLocalFolders(prev => prev.filter(f => f.id !== tempId));
      throw error;
    }

    // Replace temp folder with real one immediately
    const realFolder = folder as Folder;
    pendingUpdatesRef.current.add(realFolder.id);
    updateLocalFolders(prev =>
      prev.map(f => f.id === tempId ? realFolder : f)
    );

    return realFolder;
  };

  // Update folder with optimistic update
  const updateFolder = async (id: string, updates: Partial<Folder>) => {
    // Apply optimistic update
    const previousFolder = folders.find(f => f.id === id);
    pendingUpdatesRef.current.add(id);
    updateLocalFolders(prev =>
      prev.map(f => f.id === id ? { ...f, ...updates } : f)
    );

    const { error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  // Delete folder with optimistic update (and all children via CASCADE)
  const deleteFolder = async (id: string) => {
    // Find all descendant IDs to remove
    const getDescendantIds = (parentId: string): string[] => {
      const children = folders.filter(f => f.parent_id === parentId);
      return children.flatMap(c => [c.id, ...getDescendantIds(c.id)]);
    };
    const idsToRemove = new Set([id, ...getDescendantIds(id)]);

    // Apply optimistic update
    pendingUpdatesRef.current.add(id);
    updateLocalFolders(prev => prev.filter(f => !idsToRemove.has(f.id)));

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  // Move folder with optimistic update (change parent)
  const moveFolder = async (id: string, newParentId: string | null) => {
    pendingUpdatesRef.current.add(id);
    updateLocalFolders(prev =>
      prev.map(f => f.id === id ? { ...f, parent_id: newParentId } : f)
    );

    const { error } = await supabase
      .from('folders')
      .update({ parent_id: newParentId })
      .eq('id', id);

    if (error) throw error;
  };

  // Reorder folders with optimistic update
  const reorderFolders = async (folderIds: string[]) => {
    const updates = folderIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    // Apply optimistic update
    updateLocalFolders(prev =>
      prev.map(f => {
        const update = updates.find(u => u.id === f.id);
        if (update) {
          pendingUpdatesRef.current.add(f.id);
          return { ...f, sort_order: update.sort_order };
        }
        return f;
      })
    );

    // Batch update using Promise.all for speed
    await Promise.all(
      updates.map(update =>
        supabase
          .from('folders')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
      )
    );
  };

  // Move folder and update sort order with optimistic update
  const moveAndReorderFolder = async (
    folderId: string,
    targetId: string,
    position: 'child' | 'above' | 'below'
  ) => {
    const folder = folders.find(f => f.id === folderId);
    const target = folders.find(f => f.id === targetId);

    if (!folder || !target) return;

    let newParentId: string | null;
    let newSortOrder: number;
    const siblingUpdates: Array<{ id: string; sort_order: number }> = [];

    if (position === 'child') {
      // Insert as child of target
      newParentId = targetId;
      const targetChildren = folders.filter(f => f.parent_id === targetId);
      newSortOrder = targetChildren.length; // Add at end of children
    } else {
      // Insert as sibling of target (above or below)
      newParentId = target.parent_id;
      const siblings = folders
        .filter(f => f.parent_id === target.parent_id && f.id !== folderId)
        .sort((a, b) => a.sort_order - b.sort_order);

      const targetIndex = siblings.findIndex(s => s.id === targetId);

      if (position === 'above') {
        newSortOrder = target.sort_order;
        // Shift all siblings at or after target position
        for (let i = targetIndex; i < siblings.length; i++) {
          siblingUpdates.push({ id: siblings[i].id, sort_order: siblings[i].sort_order + 1 });
        }
      } else {
        // below
        newSortOrder = target.sort_order + 1;
        // Shift all siblings after target position
        for (let i = targetIndex + 1; i < siblings.length; i++) {
          siblingUpdates.push({ id: siblings[i].id, sort_order: siblings[i].sort_order + 1 });
        }
      }
    }

    // Apply optimistic update for moved folder and siblings
    pendingUpdatesRef.current.add(folderId);
    siblingUpdates.forEach(u => pendingUpdatesRef.current.add(u.id));

    updateLocalFolders(prev =>
      prev.map(f => {
        if (f.id === folderId) {
          return { ...f, parent_id: newParentId, sort_order: newSortOrder };
        }
        const siblingUpdate = siblingUpdates.find(u => u.id === f.id);
        if (siblingUpdate) {
          return { ...f, sort_order: siblingUpdate.sort_order };
        }
        return f;
      })
    );

    // Batch update siblings using Promise.all for speed
    if (siblingUpdates.length > 0) {
      await Promise.all(
        siblingUpdates.map(update =>
          supabase
            .from('folders')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
        )
      );
    }

    // Update the moved folder with new parent and sort order
    const { error } = await supabase
      .from('folders')
      .update({
        parent_id: newParentId,
        sort_order: newSortOrder,
      })
      .eq('id', folderId);

    if (error) throw error;
  };

  return {
    folders,
    folderTree,
    loading,
    error,
    addFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    reorderFolders,
    moveAndReorderFolder,
    refresh: fetchFolders,
  };
}

// ============================================================================
// DEVICES HOOK
// ============================================================================

export function useDevices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (error) throw error;
      setDevices(data as Device[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchDevices();

    // Subscribe to device changes
    const channel = supabase
      .channel('devices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Device>) => {
          console.log('Device change:', payload);

          if (payload.eventType === 'INSERT') {
            setDevices(prev => [...prev, payload.new as Device]);
          } else if (payload.eventType === 'UPDATE') {
            setDevices(prev =>
              prev.map(d => d.id === payload.new.id ? payload.new as Device : d)
            );
          } else if (payload.eventType === 'DELETE') {
            setDevices(prev => prev.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDevices]);

  // Register device
  const registerDevice = async (data: {
    name: string;
    device_type: 'desktop' | 'laptop' | 'mobile';
    platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'web';
    default_path?: string;
  }) => {
    if (!user) throw new Error('Not authenticated');

    // Generate device token
    const deviceToken = crypto.randomUUID();

    const { data: device, error } = await supabase
      .from('devices')
      .insert({
        user_id: user.id,
        name: data.name,
        device_type: data.device_type,
        platform: data.platform,
        default_path: data.default_path || null,
        device_token: deviceToken,
        is_online: true,
      })
      .select()
      .single();

    if (error) throw error;
    return device as Device;
  };

  // Update device
  const updateDevice = async (id: string, updates: Partial<Device>) => {
    const { error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  // Remove device
  const removeDevice = async (id: string) => {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  // Set device online status (called by desktop agent)
  const setOnlineStatus = async (deviceToken: string, isOnline: boolean) => {
    const { error } = await supabase
      .from('devices')
      .update({
        is_online: isOnline,
        last_seen_at: new Date().toISOString()
      })
      .eq('device_token', deviceToken);

    if (error) throw error;
  };

  return {
    devices,
    loading,
    error,
    registerDevice,
    updateDevice,
    removeDevice,
    setOnlineStatus,
    refresh: fetchDevices,
  };
}

// ============================================================================
// SHARING HOOK
// ============================================================================

export function useSharing(templateId: string | null) {
  const { user } = useAuth();
  const [shares, setShares] = useState<TemplateShare[]>([]);
  const [collaborators, setCollaborators] = useState<TemplateCollaborator[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch shares and collaborators
  const fetchSharingData = useCallback(async () => {
    if (!templateId) return;

    setLoading(true);

    try {
      // Fetch shares
      const { data: sharesData } = await supabase
        .from('template_shares')
        .select('*')
        .eq('template_id', templateId);

      // Fetch collaborators with user profiles
      const { data: collabsData } = await supabase
        .from('template_collaborators')
        .select(`
          *,
          user:profiles(id, display_name, email, avatar_url)
        `)
        .eq('template_id', templateId);

      setShares(sharesData as TemplateShare[] || []);
      setCollaborators(collabsData as TemplateCollaborator[] || []);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchSharingData();
  }, [fetchSharingData]);

  // Create share link (Copy Mode)
  const createShareLink = async (allowUpdates: boolean = false, expiresIn?: number) => {
    if (!templateId || !user) throw new Error('Not authenticated or no template');

    // Generate share code
    const { data: shareCode } = await supabase.rpc('generate_share_code');

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('template_shares')
      .insert({
        template_id: templateId,
        share_code: shareCode,
        created_by: user.id,
        allow_updates: allowUpdates,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;

    const share = data as TemplateShare;
    setShares(prev => [...prev, share]);

    return {
      share,
      link: `${window.location.origin}/share/${share.share_code}`,
    };
  };

  // Accept share (clone template to own account)
  const acceptShare = async (shareCode: string) => {
    if (!user) throw new Error('Not authenticated');

    // Get share info
    const { data: share, error: shareError } = await supabase
      .from('template_shares')
      .select('*, template:templates(*)')
      .eq('share_code', shareCode)
      .single();

    if (shareError || !share) throw new Error('Invalid share code');

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new Error('Share link has expired');
    }

    // Clone the template
    const newTemplateId = await supabase.rpc('clone_template', {
      source_template_id: share.template_id,
      new_owner_id: user.id,
    });

    // Increment access count
    await supabase
      .from('template_shares')
      .update({ access_count: share.access_count + 1 })
      .eq('id', share.id);

    return newTemplateId.data as string;
  };

  // Delete share
  const deleteShare = async (shareId: string) => {
    const { error } = await supabase
      .from('template_shares')
      .delete()
      .eq('id', shareId);

    if (error) throw error;
    setShares(prev => prev.filter(s => s.id !== shareId));
  };

  // Invite collaborator (Collaborate Mode)
  const inviteCollaborator = async (email: string, role: 'viewer' | 'editor' | 'admin' = 'editor') => {
    if (!templateId || !user) throw new Error('Not authenticated or no template');

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Direct add as collaborator
      const { data, error } = await supabase
        .from('template_collaborators')
        .insert({
          template_id: templateId,
          user_id: existingUser.id,
          role,
          invited_by: user.id,
          accepted_at: null, // Pending acceptance
        })
        .select(`
          *,
          user:profiles(id, display_name, email, avatar_url)
        `)
        .single();

      if (error) throw error;
      setCollaborators(prev => [...prev, data as TemplateCollaborator]);
    } else {
      // Create invite for non-existing user
      const inviteCode = crypto.randomUUID().slice(0, 8);

      await supabase
        .from('collaboration_invites')
        .insert({
          template_id: templateId,
          email,
          role,
          invited_by: user.id,
          invite_code: inviteCode,
        });

      // TODO: Send invite email
    }
  };

  // Accept collaboration invite
  const acceptInvite = async (collaboratorId: string) => {
    const { error } = await supabase
      .from('template_collaborators')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', collaboratorId);

    if (error) throw error;
    fetchSharingData();
  };

  // Remove collaborator
  const removeCollaborator = async (collaboratorId: string) => {
    const { error } = await supabase
      .from('template_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) throw error;
    setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
  };

  // Update collaborator role
  const updateCollaboratorRole = async (collaboratorId: string, role: 'viewer' | 'editor' | 'admin') => {
    const { error } = await supabase
      .from('template_collaborators')
      .update({ role })
      .eq('id', collaboratorId);

    if (error) throw error;
    setCollaborators(prev =>
      prev.map(c => c.id === collaboratorId ? { ...c, role } : c)
    );
  };

  return {
    shares,
    collaborators,
    loading,
    createShareLink,
    acceptShare,
    deleteShare,
    inviteCollaborator,
    acceptInvite,
    removeCollaborator,
    updateCollaboratorRole,
    refresh: fetchSharingData,
  };
}

// ============================================================================
// TEMPLATE APPLICATION HOOK
// ============================================================================

export function useTemplateApplication() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<TemplateApplication[]>([]);
  const [loading, setLoading] = useState(false);

  // Apply template to device
  const applyTemplate = async (
    templateId: string,
    deviceId: string,
    targetPath: string
  ) => {
    if (!user) throw new Error('Not authenticated');

    // Create application record
    const { data, error } = await supabase
      .from('template_applications')
      .insert({
        template_id: templateId,
        device_id: deviceId,
        user_id: user.id,
        target_path: targetPath,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Add to sync queue for desktop agent to pick up
    await supabase
      .from('sync_queue')
      .insert({
        user_id: user.id,
        device_id: deviceId,
        action: 'apply_template',
        payload: {
          application_id: data.id,
          template_id: templateId,
          target_path: targetPath,
        },
        status: 'pending',
      });

    return data as TemplateApplication;
  };

  // Get application history
  const fetchApplicationHistory = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('template_applications')
      .select(`
        *,
        template:templates(name),
        device:devices(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) {
      setApplications(data as TemplateApplication[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchApplicationHistory();
  }, [user]);

  return {
    applications,
    loading,
    applyTemplate,
    refresh: fetchApplicationHistory,
  };
}

// ============================================================================
// SYNC STATUS HOOK
// ============================================================================

export function useSyncStatus() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Check for pending sync items
    const checkPending = async () => {
      const { count } = await supabase
        .from('sync_queue')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      setPendingChanges(count || 0);
    };

    checkPending();

    // Subscribe to sync queue changes
    const channel = supabase
      .channel('sync-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_queue',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkPending();
          setSyncing(true);
          setTimeout(() => {
            setSyncing(false);
            setLastSyncTime(new Date());
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    syncing,
    lastSyncTime,
    pendingChanges,
    isFullySynced: pendingChanges === 0,
  };
}

// ============================================================================
// SAMPLE TEMPLATES HOOK
// ============================================================================

export function useSampleTemplates() {
  const { user } = useAuth();
  const [samples, setSamples] = useState<SampleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch sample templates
  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('sample_templates')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('popularity', { ascending: false });

      console.log('Sample templates fetch:', { data, error });

      if (error) throw error;
      setSamples(data as SampleTemplate[]);
    } catch (err) {
      console.error('Failed to fetch sample templates:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  // Clone a sample template to user's account
  const cloneSample = async (sampleId: string) => {
    if (!user) throw new Error('Not authenticated');

    console.log('Cloning sample template:', sampleId);
    const { data, error } = await supabase
      .rpc('clone_sample_template', { p_sample_id: sampleId });

    console.log('Clone result:', { data, error });

    if (error) throw error;
    return data as string; // Returns new template ID
  };

  // Get samples by category
  const getSamplesByCategory = (category: SampleTemplate['category']) => {
    return samples.filter(s => s.category === category);
  };

  // Get featured samples
  const featuredSamples = samples.filter(s => s.is_featured);

  // Get all categories
  const categories = Array.from(new Set(samples.map(s => s.category)));

  return {
    samples,
    featuredSamples,
    categories,
    loading,
    error,
    cloneSample,
    getSamplesByCategory,
    refresh: fetchSamples,
  };
}

// ============================================================================
// VERSION CONTROL HOOK
// ============================================================================

export function useVersionControl(templateId: string | null) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [changes, setChanges] = useState<TemplateChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch versions
  const fetchVersions = useCallback(async () => {
    if (!templateId) {
      setVersions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('template_versions')
        .select(`
          *,
          creator:profiles!created_by(id, display_name, avatar_url)
        `)
        .eq('template_id', templateId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data as TemplateVersion[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  // Fetch recent changes
  const fetchChanges = useCallback(async (limit: number = 50) => {
    if (!templateId) {
      setChanges([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('template_changes')
        .select(`
          *,
          changer:profiles!changed_by(id, display_name, avatar_url),
          device:devices(id, name, device_type)
        `)
        .eq('template_id', templateId)
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setChanges(data as TemplateChange[]);
    } catch (err) {
      console.error('Error fetching changes:', err);
    }
  }, [templateId]);

  useEffect(() => {
    fetchVersions();
    fetchChanges();
  }, [fetchVersions, fetchChanges]);

  // Create a new version (snapshot)
  const createVersion = async (versionName?: string, description?: string) => {
    if (!templateId) throw new Error('No template selected');

    const { data, error } = await supabase
      .rpc('create_template_version', {
        p_template_id: templateId,
        p_version_name: versionName || null,
        p_description: description || null,
      });

    if (error) throw error;

    // Refresh versions list
    await fetchVersions();
    return data as string; // Returns version ID
  };

  // Restore to a specific version
  const restoreVersion = async (versionId: string) => {
    if (!templateId) throw new Error('No template selected');

    const { data, error } = await supabase
      .rpc('restore_template_version', {
        p_template_id: templateId,
        p_version_id: versionId,
      });

    if (error) throw error;
    return data as boolean;
  };

  // Log a change (called by folder operations)
  const logChange = async (
    changeType: TemplateChange['change_type'],
    folderId?: string,
    previousValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
    deviceId?: string
  ) => {
    if (!templateId || !user) return;

    await supabase
      .from('template_changes')
      .insert({
        template_id: templateId,
        change_type: changeType,
        folder_id: folderId || null,
        previous_value: previousValue || null,
        new_value: newValue || null,
        changed_by: user.id,
        device_id: deviceId || null,
      });

    // Refresh changes
    fetchChanges();
  };

  // Get latest version
  const latestVersion = versions[0] || null;

  // Check if there are unsaved changes since last version
  const hasUnsavedChanges = changes.some(c =>
    !c.version_id && new Date(c.changed_at) > new Date(latestVersion?.created_at || 0)
  );

  return {
    versions,
    changes,
    loading,
    error,
    latestVersion,
    hasUnsavedChanges,
    createVersion,
    restoreVersion,
    logChange,
    refresh: fetchVersions,
  };
}
