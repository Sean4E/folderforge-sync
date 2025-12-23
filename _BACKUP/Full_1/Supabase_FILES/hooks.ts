// ============================================================================
// FOLDERFORGE SYNC - DATA HOOKS WITH REAL-TIME SYNC
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { 
  supabase, 
  Template, 
  Folder, 
  Device, 
  TemplateShare,
  TemplateCollaborator,
  TemplateApplication,
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
      
      const { data, error } = await supabase
        .from('templates')
        .select(`
          *,
          owner:profiles!owner_id(id, display_name, avatar_url),
          collaborators:template_collaborators(
            id, role, user_id,
            user:profiles(id, display_name, avatar_url)
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTemplates(data as Template[]);
    } catch (err) {
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
// FOLDERS HOOK (for a specific template)
// ============================================================================

export function useFolders(templateId: string | null) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderTree, setFolderTree] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    if (!templateId) {
      setFolders([]);
      setFolderTree([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');

      if (error) throw error;
      
      const folderList = data as Folder[];
      setFolders(folderList);
      setFolderTree(buildFolderTree(folderList));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  // Real-time subscription
  useEffect(() => {
    if (!templateId) return;

    fetchFolders();

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
          console.log('Folder change:', payload);
          
          // Refetch to ensure tree is properly built
          fetchFolders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [templateId, fetchFolders]);

  // Add folder
  const addFolder = async (data: { 
    name: string; 
    parent_id?: string | null; 
    folder_type?: string;
    sort_order?: number;
  }) => {
    if (!templateId) throw new Error('No template selected');

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        template_id: templateId,
        name: data.name,
        parent_id: data.parent_id || null,
        folder_type: data.folder_type || 'default',
        sort_order: data.sort_order || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return folder as Folder;
  };

  // Update folder
  const updateFolder = async (id: string, updates: Partial<Folder>) => {
    const { error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  // Delete folder (and all children via CASCADE)
  const deleteFolder = async (id: string) => {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  // Move folder (change parent)
  const moveFolder = async (id: string, newParentId: string | null) => {
    const { error } = await supabase
      .from('folders')
      .update({ parent_id: newParentId })
      .eq('id', id);

    if (error) throw error;
  };

  // Reorder folders
  const reorderFolders = async (folderIds: string[]) => {
    const updates = folderIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    // Use upsert for batch update
    for (const update of updates) {
      await supabase
        .from('folders')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);
    }
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
