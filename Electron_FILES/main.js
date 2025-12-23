// ============================================================================
// FOLDERFORGE SYNC - ELECTRON DESKTOP AGENT
// Main Process
// ============================================================================

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURATION
// ============================================================================

const store = new Store({
  name: 'folderforge-config',
  defaults: {
    deviceToken: null,
    deviceId: null,
    deviceName: null,
    defaultPath: '',
    supabaseUrl: '',
    supabaseKey: '',
    launchAtStartup: true,
    showNotifications: true,
    minimizeToTray: true,
  }
});

let tray = null;
let mainWindow = null;
let settingsWindow = null;
let supabase = null;
let syncChannel = null;
let isOnline = false;
let syncInProgress = false;
let pendingOperations = 0;

// ============================================================================
// SUPABASE CONNECTION
// ============================================================================

function initSupabase() {
  const url = store.get('supabaseUrl');
  const key = store.get('supabaseKey');
  
  if (!url || !key) {
    console.log('Supabase credentials not configured');
    return false;
  }
  
  supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
  
  return true;
}

// ============================================================================
// DEVICE AUTHENTICATION
// ============================================================================

async function authenticateDevice() {
  const deviceToken = store.get('deviceToken');
  
  if (!deviceToken || !supabase) {
    return false;
  }
  
  try {
    // Verify device token exists in database
    const { data, error } = await supabase
      .from('devices')
      .select('id, name, user_id, default_path')
      .eq('device_token', deviceToken)
      .single();
    
    if (error || !data) {
      console.error('Device authentication failed:', error);
      store.delete('deviceToken');
      store.delete('deviceId');
      return false;
    }
    
    store.set('deviceId', data.id);
    store.set('deviceName', data.name);
    if (data.default_path) {
      store.set('defaultPath', data.default_path);
    }
    
    // Update online status
    await setOnlineStatus(true);
    isOnline = true;
    
    return true;
  } catch (err) {
    console.error('Authentication error:', err);
    return false;
  }
}

async function setOnlineStatus(online) {
  const deviceToken = store.get('deviceToken');
  if (!deviceToken || !supabase) return;
  
  try {
    await supabase
      .from('devices')
      .update({ 
        is_online: online,
        last_seen_at: new Date().toISOString()
      })
      .eq('device_token', deviceToken);
  } catch (err) {
    console.error('Failed to update online status:', err);
  }
}

// ============================================================================
// REAL-TIME SYNC SUBSCRIPTION
// ============================================================================

async function startSyncListener() {
  const deviceId = store.get('deviceId');
  
  if (!deviceId || !supabase) {
    console.log('Cannot start sync listener - not authenticated');
    return;
  }
  
  // Remove existing subscription
  if (syncChannel) {
    supabase.removeChannel(syncChannel);
  }
  
  console.log('Starting sync listener for device:', deviceId);
  
  // Subscribe to sync_queue changes for this device
  syncChannel = supabase
    .channel(`sync-${deviceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sync_queue',
        filter: `device_id=eq.${deviceId}`,
      },
      async (payload) => {
        console.log('New sync operation:', payload.new);
        await processSyncOperation(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('Sync subscription status:', status);
      updateTrayIcon();
    });
  
  // Process any pending operations
  await processPendingOperations();
}

async function processPendingOperations() {
  const deviceId = store.get('deviceId');
  if (!deviceId || !supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('device_id', deviceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    pendingOperations = data?.length || 0;
    updateTrayIcon();
    
    for (const operation of data || []) {
      await processSyncOperation(operation);
    }
  } catch (err) {
    console.error('Error processing pending operations:', err);
  }
}

async function processSyncOperation(operation) {
  console.log('Processing operation:', operation.action);
  syncInProgress = true;
  updateTrayIcon();
  
  try {
    // Mark as processing
    await supabase
      .from('sync_queue')
      .update({ status: 'processing' })
      .eq('id', operation.id);
    
    let success = false;
    
    switch (operation.action) {
      case 'apply_template':
        success = await applyTemplate(operation.payload);
        break;
      case 'create_folder':
        success = await createSingleFolder(operation.payload);
        break;
      case 'delete_folder':
        success = await deleteFolderOnDisk(operation.payload);
        break;
      default:
        console.warn('Unknown operation:', operation.action);
        success = true; // Mark as completed to clear queue
    }
    
    // Update status
    await supabase
      .from('sync_queue')
      .update({ 
        status: success ? 'completed' : 'failed',
        processed_at: new Date().toISOString()
      })
      .eq('id', operation.id);
    
    if (success && store.get('showNotifications')) {
      showNotification('Sync Complete', `Operation "${operation.action}" completed successfully`);
    }
    
  } catch (err) {
    console.error('Operation failed:', err);
    
    // Update with error
    await supabase
      .from('sync_queue')
      .update({ 
        status: 'failed',
        processed_at: new Date().toISOString(),
        retry_count: operation.retry_count + 1
      })
      .eq('id', operation.id);
  }
  
  syncInProgress = false;
  pendingOperations = Math.max(0, pendingOperations - 1);
  updateTrayIcon();
}

// ============================================================================
// FOLDER CREATION
// ============================================================================

async function applyTemplate(payload) {
  const { application_id, template_id, target_path } = payload;
  
  console.log('Applying template:', template_id, 'to:', target_path);
  
  try {
    // Fetch template folders
    const { data: folders, error } = await supabase
      .from('folders')
      .select('*')
      .eq('template_id', template_id)
      .order('sort_order');
    
    if (error) throw error;
    
    // Build folder tree
    const tree = buildFolderTree(folders);
    
    // Create folders recursively
    let foldersCreated = 0;
    
    const createFoldersRecursive = async (nodes, parentPath) => {
      for (const node of nodes) {
        const folderPath = path.join(parentPath, sanitizeFolderName(node.name));
        
        // Create folder
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
          foldersCreated++;
          console.log('Created:', folderPath);
        }
        
        // Create any included files
        if (node.include_files && Array.isArray(node.include_files)) {
          for (const fileName of node.include_files) {
            const filePath = path.join(folderPath, fileName);
            if (!fs.existsSync(filePath)) {
              fs.writeFileSync(filePath, getFileTemplate(fileName));
              console.log('Created file:', filePath);
            }
          }
        }
        
        // Process children
        if (node.children && node.children.length > 0) {
          await createFoldersRecursive(node.children, folderPath);
        }
      }
    };
    
    await createFoldersRecursive(tree, target_path);
    
    // Update application record
    if (application_id) {
      await supabase
        .from('template_applications')
        .update({
          status: 'completed',
          folders_created: foldersCreated,
          completed_at: new Date().toISOString()
        })
        .eq('id', application_id);
    }
    
    showNotification('Template Applied', `Created ${foldersCreated} folders at ${target_path}`);
    
    return true;
  } catch (err) {
    console.error('Failed to apply template:', err);
    
    // Update application record with error
    if (payload.application_id) {
      await supabase
        .from('template_applications')
        .update({
          status: 'failed',
          error_message: err.message
        })
        .eq('id', payload.application_id);
    }
    
    return false;
  }
}

async function createSingleFolder(payload) {
  const { path: folderPath, name } = payload;
  const fullPath = path.join(folderPath, sanitizeFolderName(name));
  
  try {
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log('Created folder:', fullPath);
    }
    return true;
  } catch (err) {
    console.error('Failed to create folder:', err);
    return false;
  }
}

async function deleteFolderOnDisk(payload) {
  const { path: folderPath } = payload;
  
  try {
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log('Deleted folder:', folderPath);
    }
    return true;
  } catch (err) {
    console.error('Failed to delete folder:', err);
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildFolderTree(folders) {
  const map = new Map();
  const roots = [];
  
  folders.forEach(f => {
    map.set(f.id, { ...f, children: [] });
  });
  
  folders.forEach(f => {
    const node = map.get(f.id);
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
}

function sanitizeFolderName(name) {
  // Remove invalid characters for file system
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

function getFileTemplate(fileName) {
  const templates = {
    'README.md': '# Project\n\nDescription goes here.\n',
    '.gitkeep': '',
    '.gitignore': 'node_modules/\n.env\n.DS_Store\n',
    'index.html': '<!DOCTYPE html>\n<html>\n<head>\n  <title>Title</title>\n</head>\n<body>\n  \n</body>\n</html>\n',
    'style.css': '/* Styles */\n',
    'script.js': '// JavaScript\n',
    'index.js': '// Entry point\n',
    'index.ts': '// Entry point\n',
  };
  
  return templates[fileName] || '';
}

function showNotification(title, body) {
  if (!store.get('showNotifications')) return;
  
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

// ============================================================================
// TRAY ICON
// ============================================================================

function createTray() {
  // Create tray icon
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  
  // Fallback to a simple icon if asset doesn't exist
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // Create a simple 16x16 icon programmatically
    icon = nativeImage.createFromBuffer(createDefaultIcon());
  }
  
  icon = icon.resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  tray.setToolTip('FolderForge Sync');
  
  updateTrayMenu();
  
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

function createDefaultIcon() {
  // Simple 16x16 green square PNG as tray icon fallback
  // This is a minimal valid PNG with a green color
  // Base64 encoded 16x16 green PNG
  const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2Nk+M/wn4EIwDiqgWGBgaEvDBgGwwsDAOsJBgFm5xnDAAAAAElFTkSuQmCC';
  return Buffer.from(base64Icon, 'base64');
}

function updateTrayIcon() {
  if (!tray) return;
  
  let tooltip = 'FolderForge Sync';
  
  if (syncInProgress) {
    tooltip = 'Syncing...';
  } else if (pendingOperations > 0) {
    tooltip = `${pendingOperations} pending operations`;
  } else if (isOnline) {
    tooltip = 'FolderForge Sync - Connected';
  } else {
    tooltip = 'FolderForge Sync - Offline';
  }
  
  tray.setToolTip(tooltip);
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  
  const deviceName = store.get('deviceName') || 'Not configured';
  const isConfigured = !!store.get('deviceToken');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `FolderForge Sync`,
      enabled: false,
    },
    {
      label: `Device: ${deviceName}`,
      enabled: false,
    },
    {
      label: isOnline ? '● Connected' : '○ Offline',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: syncInProgress ? 'Syncing...' : 'Sync Now',
      enabled: isConfigured && !syncInProgress,
      click: () => processPendingOperations(),
    },
    {
      label: `Pending: ${pendingOperations}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        const url = store.get('supabaseUrl');
        if (url) {
          shell.openExternal(url.replace('.supabase.co', '.supabase.co').replace('https://', 'https://'));
        }
        shell.openExternal('https://folderforge.app'); // Or your actual web app URL
      },
    },
    {
      label: 'Settings',
      click: () => createSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: 'Launch at Startup',
      type: 'checkbox',
      checked: store.get('launchAtStartup'),
      click: (item) => {
        store.set('launchAtStartup', item.checked);
        app.setLoginItemSettings({
          openAtLogin: item.checked,
        });
      },
    },
    {
      label: 'Show Notifications',
      type: 'checkbox',
      checked: store.get('showNotifications'),
      click: (item) => {
        store.set('showNotifications', item.checked);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        setOnlineStatus(false).then(() => {
          app.quit();
        });
      },
    },
  ]);
  
  tray.setContextMenu(contextMenu);
}

// ============================================================================
// SETTINGS WINDOW
// ============================================================================

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  
  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'FolderForge Sync - Settings',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#18181B',
  });
  
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ============================================================================
// IPC HANDLERS
// ============================================================================

ipcMain.handle('get-config', () => {
  return {
    deviceToken: store.get('deviceToken'),
    deviceId: store.get('deviceId'),
    deviceName: store.get('deviceName'),
    defaultPath: store.get('defaultPath'),
    supabaseUrl: store.get('supabaseUrl'),
    supabaseKey: store.get('supabaseKey'),
    launchAtStartup: store.get('launchAtStartup'),
    showNotifications: store.get('showNotifications'),
    isOnline,
  };
});

ipcMain.handle('save-config', async (event, config) => {
  if (config.supabaseUrl) store.set('supabaseUrl', config.supabaseUrl);
  if (config.supabaseKey) store.set('supabaseKey', config.supabaseKey);
  if (config.deviceToken) store.set('deviceToken', config.deviceToken);
  if (config.defaultPath !== undefined) store.set('defaultPath', config.defaultPath);
  if (config.launchAtStartup !== undefined) {
    store.set('launchAtStartup', config.launchAtStartup);
    app.setLoginItemSettings({ openAtLogin: config.launchAtStartup });
  }
  if (config.showNotifications !== undefined) {
    store.set('showNotifications', config.showNotifications);
  }
  
  // Reinitialize connection
  if (config.supabaseUrl || config.supabaseKey || config.deviceToken) {
    await reconnect();
  }
  
  return { success: true };
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Default Folder Path',
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('test-connection', async () => {
  if (!initSupabase()) {
    return { success: false, error: 'Supabase not configured' };
  }
  
  const authenticated = await authenticateDevice();
  return { 
    success: authenticated, 
    error: authenticated ? null : 'Device authentication failed' 
  };
});

ipcMain.handle('disconnect', async () => {
  await setOnlineStatus(false);
  isOnline = false;
  if (syncChannel) {
    supabase.removeChannel(syncChannel);
    syncChannel = null;
  }
  updateTrayIcon();
  return { success: true };
});

async function reconnect() {
  // Disconnect existing
  if (syncChannel) {
    supabase.removeChannel(syncChannel);
    syncChannel = null;
  }
  
  // Reinitialize
  if (initSupabase()) {
    const authenticated = await authenticateDevice();
    if (authenticated) {
      await startSyncListener();
    }
  }
  
  updateTrayIcon();
}

// ============================================================================
// APP LIFECYCLE
// ============================================================================

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (settingsWindow) {
      settingsWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  // Hide dock icon on macOS (tray app)
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
  
  createTray();
  
  // Initialize Supabase and authenticate
  if (initSupabase()) {
    const authenticated = await authenticateDevice();
    if (authenticated) {
      await startSyncListener();
      showNotification('FolderForge Sync', 'Connected and ready');
    }
  }
  
  // Set login item
  app.setLoginItemSettings({
    openAtLogin: store.get('launchAtStartup'),
  });
  
  // Open settings if not configured
  if (!store.get('deviceToken')) {
    createSettingsWindow();
  }
});

app.on('window-all-closed', () => {
  // Don't quit on window close - keep tray running
});

app.on('before-quit', async () => {
  await setOnlineStatus(false);
});

// Handle app activation (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSettingsWindow();
  }
});
