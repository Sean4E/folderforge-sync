// ============================================================================
// FOLDERFORGE SYNC - NAMING PATTERN MODAL
// ============================================================================

import React, { useState, useMemo } from 'react';
import { X, Tag, Calendar, Hash, Settings2, Check, Eye, Sparkles } from 'lucide-react';
import {
  NamingPattern,
  NamingPreset,
  NAMING_PRESETS,
  applyNamingPatternWithHierarchy,
  generateHierarchyPatternPreview,
  createDefaultPattern,
  AVAILABLE_TOKENS,
  FolderForPattern,
} from '../lib/namingPatterns';

// ============================================================================
// TYPES
// ============================================================================

interface FolderForPatternWithSort extends FolderForPattern {
  parent_id: string | null;
  sort_order: number;
}

interface NamingPatternModalProps {
  folders: FolderForPatternWithSort[];
  selectedFolderIds: string[];
  onApply: (folderUpdates: Array<{ id: string; name: string }>) => Promise<void>;
  onClose: () => void;
}

// ============================================================================
// GLASS CARD COMPONENT (local copy to avoid circular imports)
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
// MAIN COMPONENT
// ============================================================================

export const NamingPatternModal: React.FC<NamingPatternModalProps> = ({
  folders,
  selectedFolderIds,
  onApply,
  onClose,
}) => {
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [selectedPreset, setSelectedPreset] = useState<NamingPreset | null>(null);
  const [customPattern, setCustomPattern] = useState<NamingPattern>(createDefaultPattern());
  const [applyTo, setApplyTo] = useState<'selected' | 'all'>('selected');
  const [applying, setApplying] = useState(false);

  // Determine target folders
  const targetFolders = useMemo(() => {
    if (applyTo === 'all' || selectedFolderIds.length === 0) {
      return folders;
    }
    return folders.filter(f => selectedFolderIds.includes(f.id));
  }, [folders, selectedFolderIds, applyTo]);

  // Get active pattern
  const activePattern = mode === 'presets' && selectedPreset
    ? selectedPreset.pattern
    : customPattern;

  // Generate preview with hierarchy awareness
  const preview = useMemo(() => {
    if (!activePattern.prefix && !activePattern.suffix) {
      return targetFolders.map(f => ({ original: f.name, new: f.name }));
    }
    // Use all folders for hierarchy calculation, but only show target folders in preview
    const previewResults = generateHierarchyPatternPreview(folders, activePattern);
    return targetFolders.map(tf => {
      const result = previewResults.find(r => r.id === tf.id);
      return {
        original: tf.name,
        new: result?.newName || tf.name,
      };
    });
  }, [targetFolders, folders, activePattern]);

  // Handle apply with hierarchy awareness
  const handleApply = async () => {
    if (!activePattern.prefix && !activePattern.suffix) return;

    setApplying(true);
    try {
      // Use all folders for hierarchy calculation to get correct indices
      const updates = targetFolders.map((folder) => ({
        id: folder.id,
        name: applyNamingPatternWithHierarchy(folder.name, activePattern, folder.id, folders),
      }));
      await onApply(updates);
      onClose();
    } catch (err) {
      console.error('Failed to apply naming pattern:', err);
    } finally {
      setApplying(false);
    }
  };

  // Category icons
  const categoryIcons: Record<string, React.ElementType> = {
    sequential: Hash,
    date: Calendar,
    category: Tag,
    custom: Settings2,
  };

  // Group presets by category
  const presetsByCategory = useMemo(() => {
    const groups: Record<string, NamingPreset[]> = {
      sequential: [],
      date: [],
      category: [],
    };
    NAMING_PRESETS.forEach(preset => {
      if (groups[preset.category]) {
        groups[preset.category].push(preset);
      }
    });
    return groups;
  }, []);

  const canApply = (mode === 'presets' && selectedPreset) ||
    (mode === 'custom' && (customPattern.prefix || customPattern.suffix));

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
              <Sparkles size={24} className="text-amber-400" />
              Naming Patterns
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              Apply consistent naming to {targetFolders.length} folder{targetFolders.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 px-6 py-4 border-b border-white/5">
          <button
            onClick={() => setMode('presets')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'presets'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'custom'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            Custom Pattern
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'presets' ? (
            <div className="space-y-6">
              {Object.entries(presetsByCategory).map(([category, presets]) => (
                <div key={category}>
                  <h3 className="text-sm text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {React.createElement(categoryIcons[category] || Tag, { size: 14 })}
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedPreset?.id === preset.id
                            ? 'bg-emerald-500/10 border-emerald-500'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white font-medium font-mono">
                            {preset.name}
                          </span>
                          {selectedPreset?.id === preset.id && (
                            <Check size={16} className="text-emerald-400" />
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Custom Pattern Builder */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Prefix</label>
                  <input
                    type="text"
                    value={customPattern.prefix}
                    onChange={(e) => setCustomPattern(prev => ({ ...prev, prefix: e.target.value }))}
                    placeholder="{nn}_"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Suffix</label>
                  <input
                    type="text"
                    value={customPattern.suffix}
                    onChange={(e) => setCustomPattern(prev => ({ ...prev, suffix: e.target.value }))}
                    placeholder="_v{n}"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Start Number</label>
                  <input
                    type="number"
                    value={customPattern.startNumber}
                    onChange={(e) => setCustomPattern(prev => ({ ...prev, startNumber: parseInt(e.target.value) || 1 }))}
                    min={0}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Increment</label>
                  <input
                    type="number"
                    value={customPattern.increment}
                    onChange={(e) => setCustomPattern(prev => ({ ...prev, increment: parseInt(e.target.value) || 1 }))}
                    min={1}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Pad Length</label>
                  <input
                    type="number"
                    value={customPattern.padLength}
                    onChange={(e) => setCustomPattern(prev => ({ ...prev, padLength: parseInt(e.target.value) || 1 }))}
                    min={1}
                    max={5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Available Tokens */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400 mb-3 font-medium">Available Tokens</p>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_TOKENS.map(({ token, description }) => (
                    <button
                      key={token}
                      onClick={() => {
                        // Add token to prefix field at cursor (simplified: append)
                        setCustomPattern(prev => ({
                          ...prev,
                          prefix: prev.prefix + token,
                        }));
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors"
                    >
                      <code className="text-emerald-400 text-xs font-mono">{token}</code>
                      <span className="text-zinc-500 text-xs truncate">{description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-400 font-medium">Preview</span>
              {activePattern.hierarchyMode && activePattern.hierarchyMode !== 'flat' && (
                <span className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">
                  Hierarchy-aware
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {preview.slice(0, 6).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="text-zinc-500 truncate max-w-[150px]">
                    {item.original}
                  </span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-emerald-400 font-medium font-mono truncate">
                    {item.new}
                  </span>
                </div>
              ))}
              {preview.length > 6 && (
                <p className="text-xs text-zinc-500 pt-1">
                  ...and {preview.length - 6} more
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input
                type="radio"
                name="applyTo"
                checked={applyTo === 'selected'}
                onChange={() => setApplyTo('selected')}
                className="text-emerald-500 focus:ring-emerald-500"
                disabled={selectedFolderIds.length === 0}
              />
              Selected ({selectedFolderIds.length})
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input
                type="radio"
                name="applyTo"
                checked={applyTo === 'all'}
                onChange={() => setApplyTo('all')}
                className="text-emerald-500 focus:ring-emerald-500"
              />
              All folders ({folders.length})
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applying || !canApply}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              {applying ? <LoadingSpinner size="sm" /> : <Check size={18} />}
              Apply Pattern
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default NamingPatternModal;
