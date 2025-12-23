// ============================================================================
// FOLDERFORGE SYNC - IMPORT DIRECTORY MODAL
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  FolderSearch,
  Folder,
  ChevronRight,
  ChevronDown,
  Hash,
  Calendar,
  Tag,
  FileCheck,
  AlertCircle,
  Upload,
  Sparkles,
} from 'lucide-react';
import type {
  ScannedFolder,
  ScanDirectoryResult,
  DetectedPatterns,
} from '../types/electron';

// ============================================================================
// TYPES
// ============================================================================

interface ImportDirectoryModalProps {
  onImport: (structure: ScannedFolder, templateName: string) => Promise<void>;
  onClose: () => void;
  onOpenNamingPatterns?: () => void;
}

// ============================================================================
// GLASS CARD COMPONENT (local copy)
// ============================================================================

const GlassCard = ({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${className}`}
  >
    {children}
  </div>
);

const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${sizes[size]} border-2 border-emerald-500 border-t-transparent rounded-full animate-spin`} />
  );
};

// ============================================================================
// FOLDER PREVIEW TREE
// ============================================================================

const FolderPreviewNode = ({
  node,
  level = 0,
  expanded,
  onToggle,
}: {
  node: ScannedFolder;
  level?: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.path);

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-1 py-1 px-2 hover:bg-white/5 rounded-lg transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => onToggle(node.path)} className="p-0.5 hover:bg-white/10 rounded">
            {isExpanded ? (
              <ChevronDown size={14} className="text-zinc-400" />
            ) : (
              <ChevronRight size={14} className="text-zinc-400" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <Folder size={14} className="text-amber-400" />
        <span className="text-sm text-zinc-300 truncate">{node.name}</span>
        {hasChildren && (
          <span className="text-xs text-zinc-500 ml-1">({node.children.length})</span>
        )}
      </div>
      {isExpanded && node.children?.map((child, idx) => (
        <FolderPreviewNode
          key={child.path || idx}
          node={child}
          level={level + 1}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};

// ============================================================================
// PATTERN DETECTION DISPLAY
// ============================================================================

const PatternBadge = ({
  type,
  pattern,
}: {
  type: 'numericPrefix' | 'datePrefix' | 'categoryPrefix' | 'versionSuffix';
  pattern: { count: number; confidence: number; examples: string[] };
}) => {
  if (pattern.confidence < 20) return null;

  const config = {
    numericPrefix: { icon: Hash, label: 'Numeric Prefix', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    datePrefix: { icon: Calendar, label: 'Date Prefix', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    categoryPrefix: { icon: Tag, label: 'Category Prefix', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    versionSuffix: { icon: FileCheck, label: 'Version Suffix', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  };

  const { icon: Icon, label, color } = config[type];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${color}`}>
      <Icon size={14} />
      <div className="flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs opacity-70">{pattern.confidence}% match</p>
      </div>
      <div className="text-xs opacity-60">
        {pattern.examples.slice(0, 2).join(', ')}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ImportDirectoryModal: React.FC<ImportDirectoryModalProps> = ({
  onImport,
  onClose,
  onOpenNamingPatterns,
}) => {
  const [directoryPath, setDirectoryPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanDirectoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Check if desktop API is available
  const hasDesktopAPI = typeof window !== 'undefined' && window.api;

  // Handle browse button
  const handleBrowse = async () => {
    if (!window.api) return;

    const result = await window.api.browseDirectory();
    if (result.success && result.path) {
      setDirectoryPath(result.path);
      setError(null);
      setScanResult(null);
    }
  };

  // Handle scan
  const handleScan = async () => {
    if (!window.api || !directoryPath.trim()) return;

    setScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const result = await window.api.scanDirectory(directoryPath.trim());

      if (result.success) {
        setScanResult(result);
        // Set default template name from root folder name
        if (result.structure?.name) {
          setTemplateName(result.structure.name);
        }
        // Expand root folder by default
        if (result.structure?.path) {
          setExpandedFolders(new Set([result.structure.path]));
        }
      } else {
        setError(result.error || 'Failed to scan directory');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScanning(false);
    }
  };

  // Handle folder expand toggle
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Handle import
  const handleImport = async () => {
    if (!scanResult?.structure || !templateName.trim()) return;

    setImporting(true);
    try {
      await onImport(scanResult.structure, templateName.trim());
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  // Get detected patterns from all levels
  const detectedPatterns = useMemo(() => {
    if (!scanResult?.patterns) return null;

    const allPatterns: DetectedPatterns = {
      numericPrefix: { count: 0, confidence: 0, examples: [] },
      datePrefix: { count: 0, confidence: 0, examples: [] },
      categoryPrefix: { count: 0, confidence: 0, examples: [] },
      versionSuffix: { count: 0, confidence: 0, examples: [] },
    };

    // Merge patterns from all levels, keeping highest confidence
    Object.values(scanResult.patterns).forEach(levelPatterns => {
      (Object.keys(allPatterns) as (keyof DetectedPatterns)[]).forEach(key => {
        if (levelPatterns[key].confidence > allPatterns[key].confidence) {
          allPatterns[key] = levelPatterns[key];
        }
      });
    });

    return allPatterns;
  }, [scanResult?.patterns]);

  const hasPatterns = detectedPatterns && Object.values(detectedPatterns).some(p => p.confidence >= 20);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <GlassCard
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FolderSearch size={24} className="text-cyan-400" />
              Import Directory
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              Scan a directory to import its structure as a template
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!hasDesktopAPI ? (
            <div className="text-center py-8">
              <AlertCircle size={48} className="mx-auto mb-4 text-amber-400" />
              <h3 className="text-white font-medium mb-2">Desktop Agent Required</h3>
              <p className="text-zinc-400 text-sm">
                Directory import requires the FolderForge desktop agent to be running.
                <br />
                Please install and run the desktop agent to use this feature.
              </p>
            </div>
          ) : (
            <>
              {/* Directory Path Input */}
              <div className="space-y-3">
                <label className="text-sm text-zinc-400 block">Directory Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={directoryPath}
                    onChange={(e) => setDirectoryPath(e.target.value)}
                    placeholder="C:\Projects\MyProject"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    onClick={handleBrowse}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                  >
                    Browse
                  </button>
                  <button
                    onClick={handleScan}
                    disabled={scanning || !directoryPath.trim()}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    {scanning ? <LoadingSpinner size="sm" /> : <FolderSearch size={16} />}
                    Scan
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Scan Results */}
              {scanResult?.success && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-2xl font-bold text-white">{scanResult.stats?.totalFolders}</p>
                      <p className="text-xs text-zinc-400">Total Folders</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-2xl font-bold text-white">{scanResult.stats?.maxDepth}</p>
                      <p className="text-xs text-zinc-400">Max Depth</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-2xl font-bold text-white">
                        {hasPatterns ? 'Yes' : 'No'}
                      </p>
                      <p className="text-xs text-zinc-400">Patterns Detected</p>
                    </div>
                  </div>

                  {/* Detected Patterns */}
                  {hasPatterns && detectedPatterns && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-zinc-400 flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-400" />
                          Detected Naming Patterns
                        </label>
                        {onOpenNamingPatterns && (
                          <button
                            onClick={onOpenNamingPatterns}
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            Apply patterns after import
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <PatternBadge type="numericPrefix" pattern={detectedPatterns.numericPrefix} />
                        <PatternBadge type="datePrefix" pattern={detectedPatterns.datePrefix} />
                        <PatternBadge type="categoryPrefix" pattern={detectedPatterns.categoryPrefix} />
                        <PatternBadge type="versionSuffix" pattern={detectedPatterns.versionSuffix} />
                      </div>
                    </div>
                  )}

                  {/* Template Name */}
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 block">Template Name</label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="My Template"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Folder Preview */}
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 block">Folder Structure Preview</label>
                    <div className="bg-white/5 rounded-xl border border-white/10 p-2 max-h-60 overflow-y-auto">
                      {scanResult.structure && (
                        <FolderPreviewNode
                          node={scanResult.structure}
                          expanded={expandedFolders}
                          onToggle={toggleFolder}
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !scanResult?.success || !templateName.trim()}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
          >
            {importing ? <LoadingSpinner size="sm" /> : <Upload size={18} />}
            Import as Template
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default ImportDirectoryModal;
