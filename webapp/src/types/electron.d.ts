// ============================================================================
// FOLDERFORGE SYNC - ELECTRON API TYPE DECLARATIONS
// ============================================================================

/**
 * Scanned folder structure from directory import
 */
export interface ScannedFolder {
  name: string;
  path: string;
  children: ScannedFolder[];
}

/**
 * Pattern detection result
 */
export interface DetectedPattern {
  count: number;
  confidence: number;
  examples: string[];
}

/**
 * Pattern detection results by type
 */
export interface DetectedPatterns {
  numericPrefix: DetectedPattern;
  datePrefix: DetectedPattern;
  categoryPrefix: DetectedPattern;
  versionSuffix: DetectedPattern;
}

/**
 * Directory scan statistics
 */
export interface ScanStats {
  totalFolders: number;
  maxDepth: number;
  rootPath: string;
}

/**
 * Result from scan-directory IPC call
 */
export interface ScanDirectoryResult {
  success: boolean;
  error?: string;
  structure?: ScannedFolder;
  stats?: ScanStats;
  patterns?: Record<number, DetectedPatterns>;
}

/**
 * Result from browse-directory IPC call
 */
export interface BrowseDirectoryResult {
  success: boolean;
  canceled?: boolean;
  path?: string;
}

/**
 * Desktop agent configuration
 */
export interface DesktopConfig {
  deviceToken: string | null;
  deviceId: string | null;
  deviceName: string | null;
  defaultPath: string;
  supabaseUrl: string;
  supabaseKey: string;
  launchAtStartup: boolean;
  showNotifications: boolean;
  minimizeToTray: boolean;
}

/**
 * Electron API exposed to renderer via preload
 */
export interface ElectronAPI {
  // Configuration
  getConfig: () => Promise<DesktopConfig>;
  saveConfig: (config: Partial<DesktopConfig>) => Promise<{ success: boolean; error?: string }>;

  // Folder selection
  selectFolder: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>;

  // Directory scanning for import
  browseDirectory: () => Promise<BrowseDirectoryResult>;
  scanDirectory: (path: string) => Promise<ScanDirectoryResult>;

  // Connection
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<{ success: boolean }>;

  // Events
  onSyncStatus: (callback: (status: { syncing: boolean; pending: number }) => void) => void;
  onNotification: (callback: (data: { title: string; body: string }) => void) => void;
}

// Extend the Window interface
declare global {
  interface Window {
    api?: ElectronAPI;
  }
}

export {};
