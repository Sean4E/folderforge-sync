// ============================================================================
// FOLDERFORGE SYNC - MAIN APPLICATION COMPONENT
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Folder,
  FolderPlus,
  FolderTree,
  Monitor,
  Smartphone,
  Laptop,
  Cloud,
  Share2,
  Users,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Home,
  RefreshCw,
  Download,
  Search,
  Wifi,
  WifiOff,
  Menu,
  Bell,
  Layers,
  Send,
  ArrowRight,
  FolderOpen,
  FileText,
  Image,
  Code,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
  History,
  GitBranch,
  RotateCcw,
  Save,
  Star,
  Sparkles,
  Package,
  Globe,
  Server,
  Palette,
  Tag,
  ChevronsRight,
  ChevronsLeft,
  GripVertical,
  Upload,
  Hash,
  ChevronsUpDown,
  Minimize2,
  Maximize2,
  Undo2,
  Redo2,
} from 'lucide-react';
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useAuth } from '../lib/auth';
import { ProfileMenu } from '../lib/AuthUI';
import { useTemplates, useFolders, useDevices, useSharing, useTemplateApplication, useSyncStatus, useSampleTemplates, useVersionControl, useUndoRedo } from '../lib/hooks';
import { supabase, Template, Folder as FolderType, Device, SampleTemplate, TemplateVersion } from '../lib/supabase';
import { NamingPatternModal } from './NamingPatternModal';
import { DropContextMenu, DropPosition } from './DropContextMenu';
import { ImportDirectoryModal } from './ImportDirectoryModal';
import type { ScannedFolder } from '../types/electron';
import {
  generateNextFolderName,
  stripPrefixSuffix,
  analyzeTreePattern,
  parseFolderName,
  renumberFoldersByPosition,
  FolderForPattern,
} from '../lib/namingPatterns';

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const SyncPulse = ({ syncing }: { syncing: boolean }) => (
  <div className="relative">
    {syncing && (
      <>
        <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
        <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse" />
      </>
    )}
    <div className={`w-2.5 h-2.5 rounded-full ${syncing ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
  </div>
);

const DeviceStatus = ({ online, lastSeen }: { online: boolean; lastSeen?: string }) => {
  const formatLastSeen = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex items-center gap-2">
      {online ? (
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
          <Wifi size={12} />
          <span>Online</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
          <WifiOff size={12} />
          <span>Offline</span>
        </div>
      )}
      {lastSeen && (
        <span className="text-zinc-500 text-xs">• {formatLastSeen(lastSeen)}</span>
      )}
    </div>
  );
};

const GlassCard = ({
  children,
  className = '',
  hover = true,
  onClick
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onClick}
    className={`
      bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl
      ${hover ? 'hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

const FolderIcon = ({ type = 'default', size = 20, open = false }: { type?: string; size?: number; open?: boolean }) => {
  const colors: Record<string, string> = {
    default: 'text-amber-400',
    assets: 'text-purple-400',
    docs: 'text-blue-400',
    media: 'text-pink-400',
    code: 'text-emerald-400',
    archive: 'text-zinc-400',
    data: 'text-cyan-400',
  };

  const IconComponent = open ? FolderOpen : Folder;
  return <IconComponent size={size} className={colors[type] || colors.default} />;
};

const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${sizes[size]} border-2 border-emerald-500 border-t-transparent rounded-full animate-spin`} />
  );
};

const EmptyState = ({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="p-4 bg-white/5 rounded-full mb-4">
      <Icon size={32} className="text-zinc-400" />
    </div>
    <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
    <p className="text-zinc-400 text-sm text-center max-w-sm mb-4">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm text-white font-medium flex items-center gap-2 transition-colors"
      >
        <Plus size={16} /> {action.label}
      </button>
    )}
  </div>
);

// ============================================================================
// DRAGGABLE TREE NODE COMPONENT
// ============================================================================

interface DraggableTreeNodeProps {
  node: FolderType;
  level?: number;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string | null) => void;
  selectedId: string | null;
  editingId: string | null;
  onEditSave: (id: string, name: string) => void;
  expandedIds: Set<string>;
  onIndent?: (id: string) => void;
  onOutdent?: (id: string) => void;
  canIndent?: (id: string) => boolean;
  canOutdent?: (id: string) => boolean;
  isDragging?: boolean;
}

const DraggableTreeNode = ({
  node,
  level = 0,
  onToggle,
  onSelect,
  onAdd,
  onDelete,
  onEdit,
  selectedId,
  editingId,
  onEditSave,
  expandedIds,
  onIndent,
  onOutdent,
  canIndent,
  canOutdent,
  isDragging: parentIsDragging,
}: DraggableTreeNodeProps) => {
  const [editName, setEditName] = useState(node.name);
  const isEditing = editingId === node.id;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    isOver,
  } = useSortable({
    id: node.id,
    data: { node, level },
  });

  // Make the dragged item semi-transparent during drag
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.3 : 1,
    transition: 'opacity 150ms ease',
  };

  useEffect(() => {
    setEditName(node.name);
  }, [node.name]);

  return (
    <div ref={setNodeRef} style={style} className="select-none" id={`folder-${node.id}`}>
      <div
        className={`
          flex items-center gap-1 py-1.5 px-2 rounded-lg group transition-all duration-150
          ${selectedId === node.id ? 'bg-white/10' : 'hover:bg-white/5'}
          ${isOver && !isDragging ? 'ring-2 ring-cyan-400 bg-cyan-500/20 scale-[1.01]' : ''}
          ${isDragging ? 'ring-2 ring-emerald-500/50 bg-emerald-500/10' : ''}
        `}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* Drag Handle - always visible for better UX */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>

        {hasChildren ? (
          <button onClick={() => onToggle(node.id)} className="p-0.5 hover:bg-white/10 rounded">
            {isExpanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <FolderIcon type={node.folder_type} open={isExpanded && hasChildren} />

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm text-white flex-1 focus:outline-none focus:border-emerald-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditSave(node.id, editName);
                if (e.key === 'Escape') onEdit(null);
              }}
            />
            <button onClick={() => onEditSave(node.id, editName)} className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400">
              <Check size={14} />
            </button>
            <button onClick={() => onEdit(null)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <span
              className="text-sm text-zinc-200 flex-1 cursor-pointer truncate"
              onClick={() => onSelect(node.id)}
            >
              {node.name}
            </span>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onOutdent && canOutdent?.(node.id) && (
                <button
                  onClick={() => onOutdent(node.id)}
                  className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-cyan-400"
                  title="Move up a level (Outdent)"
                >
                  <ChevronsLeft size={14} />
                </button>
              )}
              {onIndent && canIndent?.(node.id) && (
                <button
                  onClick={() => onIndent(node.id)}
                  className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-cyan-400"
                  title="Move down a level (Indent)"
                >
                  <ChevronsRight size={14} />
                </button>
              )}
              <button
                onClick={() => onAdd(node.id)}
                className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-emerald-400"
                title="Add subfolder"
              >
                <FolderPlus size={14} />
              </button>
              <button
                onClick={() => { setEditName(node.name); onEdit(node.id); }}
                className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-blue-400"
                title="Rename"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => onDelete(node.id)}
                className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-red-400"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {isExpanded && node.children?.map(child => (
        <DraggableTreeNode
          key={child.id}
          node={child}
          level={level + 1}
          onToggle={onToggle}
          onSelect={onSelect}
          onAdd={onAdd}
          onDelete={onDelete}
          onEdit={onEdit}
          selectedId={selectedId}
          editingId={editingId}
          onEditSave={onEditSave}
          expandedIds={expandedIds}
          onIndent={onIndent}
          onOutdent={onOutdent}
          canIndent={canIndent}
          canOutdent={canOutdent}
          isDragging={isDragging || parentIsDragging}
        />
      ))}
    </div>
  );
};


// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

const TemplateCard = ({
  template,
  onSelect,
  onShare,
  onApply,
  onEdit,
  onDelete,
  onRename,
  selected
}: {
  template: Template;
  onSelect: (id: string) => void;
  onShare: (template: Template) => void;
  onApply: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  selected: boolean;
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(template.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== template.name) {
      onRename(template.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenameValue(template.name);
      setIsRenaming(false);
    }
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    pink: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    zinc: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
  };

  const colors = colorMap[template.color] || colorMap.amber;
  const hasCollaborators = template.collaborators && template.collaborators.length > 0;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <GlassCard
      className={`p-4 ${selected ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : ''}`}
      onClick={() => onSelect(template.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colors.bg}`}>
          <FolderTree size={22} className={colors.text} />
        </div>
        <div className="flex items-center gap-1">
          {template.is_public && (
            <div className="p-1.5 bg-blue-500/20 rounded-lg" title="Public template">
              <Share2 size={12} className="text-blue-400" />
            </div>
          )}
          {hasCollaborators && (
            <div className="p-1.5 bg-purple-500/20 rounded-lg" title="Collaborative">
              <Users size={12} className="text-purple-400" />
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(template.id); }}
            className="p-1.5 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isRenaming ? (
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleRenameKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-white/10 border border-emerald-500 rounded px-2 py-1 text-white font-medium mb-1 text-sm focus:outline-none"
        />
      ) : (
        <h3
          className="text-white font-medium mb-1 truncate cursor-text hover:text-emerald-400 transition-colors"
          onDoubleClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
          title="Double-click to rename"
        >
          {template.name}
        </h3>
      )}
      <p className="text-zinc-400 text-xs mb-3">
        {template.folder_count} folders • {template.max_depth} levels
      </p>

      {template.description && (
        <p className="text-zinc-500 text-xs mb-3 line-clamp-2">{template.description}</p>
      )}

      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-zinc-500">Updated {formatDate(template.updated_at)}</span>
      </div>

      <div className="flex gap-2 pt-3 border-t border-white/10">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(template); }}
          className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
        >
          <Edit3 size={12} /> Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onApply(template); }}
          className="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
        >
          <Download size={12} /> Apply
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(template); }}
          className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
        >
          <Share2 size={12} /> Share
        </button>
      </div>
    </GlassCard>
  );
};

// ============================================================================
// DEVICE CARD COMPONENT
// ============================================================================

const DeviceCard = ({
  device,
  onRemove,
  onSync,
  showToken
}: {
  device: Device;
  onRemove: (id: string) => void;
  onSync: (id: string) => void;
  showToken?: boolean;
}) => {
  const [tokenVisible, setTokenVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const icons = {
    desktop: Monitor,
    laptop: Laptop,
    mobile: Smartphone,
  };
  const Icon = icons[device.device_type] || Monitor;

  const copyToken = () => {
    if (device.device_token) {
      navigator.clipboard.writeText(device.device_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <GlassCard className="p-4" hover={false}>
      <div className="flex items-start gap-3">
        <div className={`p-3 rounded-xl ${device.is_online ? 'bg-emerald-500/20' : 'bg-zinc-500/20'}`}>
          <Icon size={24} className={device.is_online ? 'text-emerald-400' : 'text-zinc-400'} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">{device.name}</h3>
            {device.platform && (
              <span className="px-1.5 py-0.5 bg-white/10 text-zinc-400 text-[10px] rounded-full capitalize">
                {device.platform}
              </span>
            )}
          </div>
          <DeviceStatus online={device.is_online} lastSeen={device.last_seen_at} />
          {device.default_path && (
            <p className="text-zinc-500 text-xs mt-1 truncate font-mono">{device.default_path}</p>
          )}

          {showToken && device.device_token && (
            <div className="mt-3 p-2 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-400">Device Token</span>
                <button
                  onClick={() => setTokenVisible(!tokenVisible)}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {tokenVisible ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-zinc-300 font-mono flex-1 truncate">
                  {tokenVisible ? device.device_token : '••••••••••••••••'}
                </code>
                <button
                  onClick={copyToken}
                  className={`p-1 rounded ${copied ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => onSync(device.id)}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
            title="Force sync"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => onRemove(device.id)}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
            title="Remove device"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

// ============================================================================
// SHARE MODAL COMPONENT
// ============================================================================

const ShareModal = ({
  template,
  onClose
}: {
  template: Template | null;
  onClose: () => void;
}) => {
  const [mode, setMode] = useState<'copy' | 'collaborate'>('copy');
  const [email, setEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const { createShareLink, inviteCollaborator, collaborators } = useSharing(template?.id || null);
  const { user, profile } = useAuth();

  const handleCreateLink = async () => {
    if (!template) return;
    setLoading(true);
    try {
      const result = await createShareLink(false);
      setShareLink(result.link);
    } catch (err) {
      console.error('Failed to create share link:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await inviteCollaborator(email.trim(), 'editor');
      setEmail('');
    } catch (err) {
      console.error('Failed to invite:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <GlassCard
        className="w-full max-w-md p-6"
        hover={false}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Share Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
          <button
            onClick={() => setMode('copy')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
              ${mode === 'copy' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
          >
            <Copy size={16} /> Share Copy
          </button>
          <button
            onClick={() => setMode('collaborate')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
              ${mode === 'collaborate' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
          >
            <Users size={16} /> Collaborate
          </button>
        </div>

        {mode === 'copy' ? (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              Anyone with this link will get their own copy of this template to use and modify independently.
            </p>

            {!shareLink ? (
              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <LoadingSpinner size="sm" /> : <Share2 size={18} />}
                Generate Share Link
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none"
                />
                <button
                  onClick={copyLink}
                  className={`px-4 rounded-xl font-medium text-sm transition-all flex items-center gap-2
                    ${linkCopied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              Invite collaborators to edit this template together. Changes sync in real-time for everyone.
            </p>

            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <button
                onClick={handleInvite}
                disabled={loading || !email.trim()}
                className="px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 text-white rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
              >
                {loading ? <LoadingSpinner size="sm" /> : <Send size={16} />}
                Invite
              </button>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/10">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Collaborators</p>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm text-white">{profile?.display_name || user?.email}</p>
                    <p className="text-xs text-zinc-500">Owner</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">Owner</span>
              </div>

              {collaborators.map(collab => (
                <div key={collab.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {collab.user?.display_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm text-white">{collab.user?.display_name || 'Unknown'}</p>
                      <p className="text-xs text-zinc-500 capitalize">{collab.role}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    collab.accepted_at ? 'text-blue-400 bg-blue-500/20' : 'text-yellow-400 bg-yellow-500/20'
                  }`}>
                    {collab.accepted_at ? collab.role : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

// ============================================================================
// APPLY MODAL COMPONENT
// ============================================================================

const ApplyModal = ({
  template,
  onClose
}: {
  template: Template | null;
  onClose: () => void;
}) => {
  const { devices, loading: devicesLoading } = useDevices();
  const { applyTemplate } = useTemplateApplication();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState('');
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onlineDevices = devices.filter(d => d.is_online);

  const handleApply = async () => {
    if (!template || !selectedDevice) return;

    const device = devices.find(d => d.id === selectedDevice);
    const targetPath = customPath.trim() || device?.default_path || '';

    if (!targetPath) {
      setError('Please specify a target path');
      return;
    }

    setApplying(true);
    setError(null);

    try {
      await applyTemplate(template.id, selectedDevice, targetPath);
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setApplying(false);
    }
  };

  if (!template) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <GlassCard
        className="w-full max-w-md p-6"
        hover={false}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Apply Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-8">
            <div className="p-4 bg-emerald-500/20 rounded-full mb-4">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <p className="text-white font-medium">Template Applied!</p>
            <p className="text-zinc-400 text-sm">Folders are being created on your device.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-6">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <FolderTree size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium">{template.name}</p>
                <p className="text-zinc-400 text-xs">{template.folder_count} folders • {template.max_depth} levels</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl mb-4">
                <AlertCircle size={18} className="text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <p className="text-sm text-zinc-400 mb-3">Select target device:</p>

            {devicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : onlineDevices.length === 0 ? (
              <div className="text-center py-6 text-zinc-400">
                <WifiOff size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No online devices available</p>
                <p className="text-xs mt-1">Start the desktop agent on your computer</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {onlineDevices.map(device => (
                  <button
                    key={device.id}
                    onClick={() => {
                      setSelectedDevice(device.id);
                      if (device.default_path) setCustomPath(device.default_path);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all
                      ${selectedDevice === device.id
                        ? 'bg-emerald-500/10 border-emerald-500'
                        : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                  >
                    <Monitor size={20} className={selectedDevice === device.id ? 'text-emerald-400' : 'text-zinc-400'} />
                    <div className="text-left flex-1">
                      <p className={`text-sm ${selectedDevice === device.id ? 'text-emerald-400' : 'text-white'}`}>{device.name}</p>
                      {device.default_path && (
                        <p className="text-xs text-zinc-500 font-mono truncate">{device.default_path}</p>
                      )}
                    </div>
                    {selectedDevice === device.id && <Check size={18} className="text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-6">
              <label className="text-sm text-zinc-400 mb-2 block">Target path:</label>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="C:\Projects\MyProject"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <button
              onClick={handleApply}
              disabled={!selectedDevice || applying}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {applying ? <LoadingSpinner size="sm" /> : <Download size={18} />}
              {applying ? 'Creating Folders...' : 'Create Folders'}
            </button>
          </>
        )}
      </GlassCard>
    </div>
  );
};

// ============================================================================
// CREATE TEMPLATE MODAL
// ============================================================================

const CreateTemplateModal = ({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (template: Template) => void;
}) => {
  const { createTemplate } = useTemplates();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('amber');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorStyles: Record<string, string> = {
    amber: '#f59e0b',
    blue: '#3b82f6',
    emerald: '#10b981',
    purple: '#8b5cf6',
    pink: '#ec4899',
    orange: '#f97316',
    cyan: '#06b6d4',
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a template name');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const template = await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      onCreated(template);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <GlassCard
        className="w-full max-w-md p-6"
        hover={false}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Create Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl mb-4">
            <AlertCircle size={18} className="text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project Template"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your template..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Color</label>
            <div className="flex gap-2">
              {Object.entries(colorStyles).map(([c, hex]) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'scale-110 ring-2 ring-white' : 'opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          {creating ? <LoadingSpinner size="sm" /> : <Plus size={18} />}
          {creating ? 'Creating...' : 'Create Template'}
        </button>
      </GlassCard>
    </div>
  );
};

// ============================================================================
// ADD DEVICE MODAL
// ============================================================================

const AddDeviceModal = ({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (device: Device) => void;
}) => {
  const { registerDevice } = useDevices();
  const [name, setName] = useState('');
  const [deviceType, setDeviceType] = useState<'desktop' | 'laptop' | 'mobile'>('desktop');
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [defaultPath, setDefaultPath] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState<Device | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a device name');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const device = await registerDevice({
        name: name.trim(),
        device_type: deviceType,
        platform,
        default_path: defaultPath.trim() || undefined,
      });
      setNewDevice(device);
      onCreated(device);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <GlassCard
        className="w-full max-w-md p-6"
        hover={false}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {newDevice ? 'Device Registered!' : 'Add Device'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {newDevice ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
              <CheckCircle size={24} className="text-emerald-400" />
              <div>
                <p className="text-white font-medium">Device registered successfully!</p>
                <p className="text-emerald-400 text-sm">Copy the token below to your desktop agent.</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl">
              <label className="text-xs text-zinc-400 mb-2 block">Device Token</label>
              <div className="flex items-center gap-2">
                <code className="text-sm text-emerald-400 font-mono flex-1 break-all">
                  {newDevice.device_token}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newDevice.device_token || '');
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <p className="text-zinc-400 text-sm">
              Paste this token in your FolderForge desktop agent settings to connect this device.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl mb-4">
                <AlertCircle size={18} className="text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Device Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Main Workstation"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Device Type</label>
                <div className="flex gap-2">
                  {[
                    { type: 'desktop', icon: Monitor, label: 'Desktop' },
                    { type: 'laptop', icon: Laptop, label: 'Laptop' },
                    { type: 'mobile', icon: Smartphone, label: 'Mobile' },
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => setDeviceType(type as typeof deviceType)}
                      className={`flex-1 p-3 rounded-xl border transition-all flex flex-col items-center gap-2
                        ${deviceType === type
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}
                    >
                      <Icon size={20} />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Platform</label>
                <div className="flex gap-2">
                  {['windows', 'macos', 'linux'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p as typeof platform)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm capitalize transition-all
                        ${platform === p
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Default Path (optional)</label>
                <input
                  type="text"
                  value={defaultPath}
                  onChange={(e) => setDefaultPath(e.target.value)}
                  placeholder={platform === 'windows' ? 'C:\\Projects' : '/home/user/projects'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {creating ? <LoadingSpinner size="sm" /> : <Plus size={18} />}
              {creating ? 'Registering...' : 'Register Device'}
            </button>
          </>
        )}
      </GlassCard>
    </div>
  );
};

// ============================================================================
// SAMPLE TEMPLATES GALLERY
// ============================================================================

const categoryIcons: Record<string, typeof Globe> = {
  web: Globe,
  mobile: Smartphone,
  backend: Server,
  devops: Package,
  design: Palette,
  general: FolderTree,
};

const categoryColors: Record<string, string> = {
  web: 'bg-blue-500/20 text-blue-400',
  mobile: 'bg-purple-500/20 text-purple-400',
  backend: 'bg-amber-500/20 text-amber-400',
  devops: 'bg-orange-500/20 text-orange-400',
  design: 'bg-pink-500/20 text-pink-400',
  general: 'bg-emerald-500/20 text-emerald-400',
};

const SampleTemplatesGallery = ({
  onClose,
  onClone
}: {
  onClose: () => void;
  onClone: (templateId: string) => void;
}) => {
  const { samples, featuredSamples, categories, loading, cloneSample } = useSampleTemplates();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  const displayedSamples = selectedCategory
    ? samples.filter(s => s.category === selectedCategory)
    : samples;

  const handleClone = async (sampleId: string) => {
    setCloning(sampleId);
    try {
      const newTemplateId = await cloneSample(sampleId);
      onClone(newTemplateId);
      onClose();
    } catch (err) {
      console.error('Failed to clone sample:', err);
    } finally {
      setCloning(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <GlassCard
        className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        hover={false}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Sparkles size={24} className="text-amber-400" />
              Sample Templates
            </h2>
            <p className="text-zinc-400 text-sm mt-1">Start with a pre-built folder structure</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 px-6 py-4 overflow-x-auto border-b border-white/5">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${!selectedCategory ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
          >
            All
          </button>
          {categories.map(cat => {
            const Icon = categoryIcons[cat] || FolderTree;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2
                  ${selectedCategory === cat ? categoryColors[cat] : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
              >
                <Icon size={16} />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : displayedSamples.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p>No templates in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedSamples.map(sample => {
                const Icon = categoryIcons[sample.category] || FolderTree;
                return (
                  <div
                    key={sample.id}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-xl ${categoryColors[sample.category]}`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium truncate">{sample.name}</h3>
                          {sample.is_featured && (
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{sample.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {sample.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-white/5 text-zinc-500 text-xs rounded-full">
                              {tag}
                            </span>
                          ))}
                          {sample.popularity > 0 && (
                            <span className="text-zinc-500 text-xs">
                              {sample.popularity} uses
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleClone(sample.id)}
                      disabled={cloning === sample.id}
                      className="w-full mt-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:bg-zinc-700 text-emerald-400 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {cloning === sample.id ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Cloning...
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Use This Template
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

// ============================================================================
// VERSION HISTORY PANEL
// ============================================================================

const VersionHistoryPanel = ({
  templateId,
  onRestore,
  onClose
}: {
  templateId: string;
  onRestore: () => void;
  onClose: () => void;
}) => {
  const { versions, changes, loading, hasUnsavedChanges, createVersion, restoreVersion } = useVersionControl(templateId);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [versionName, setVersionName] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateVersion = async () => {
    setCreating(true);
    try {
      await createVersion(versionName || undefined, versionDescription || undefined);
      setVersionName('');
      setVersionDescription('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create version:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version? Current changes will be overwritten.')) return;

    setRestoring(versionId);
    try {
      await restoreVersion(versionId);
      onRestore();
    } catch (err) {
      console.error('Failed to restore version:', err);
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'folder_add': return <FolderPlus size={14} className="text-emerald-400" />;
      case 'folder_delete': return <Trash2 size={14} className="text-red-400" />;
      case 'folder_rename': return <Edit3 size={14} className="text-blue-400" />;
      case 'folder_move': return <ArrowRight size={14} className="text-amber-400" />;
      default: return <GitBranch size={14} className="text-zinc-400" />;
    }
  };

  return (
    <GlassCard className="h-full flex flex-col" hover={false}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-medium flex items-center gap-2">
          <History size={18} className="text-emerald-400" />
          Version History
        </h3>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 border-b border-white/5">
        {showCreateForm ? (
          <div className="space-y-3">
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Version name (e.g., v2.0)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={versionDescription}
              onChange={(e) => setVersionDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateVersion}
                disabled={creating}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {creating ? <LoadingSpinner size="sm" /> : <Save size={14} />}
                Save
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Create Version Snapshot
            {hasUnsavedChanges && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded-full">
                unsaved
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <GitBranch size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No versions yet</p>
            <p className="text-xs mt-1">Create your first version snapshot</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className={`p-3 rounded-xl border transition-all ${
                  index === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">
                        {version.version_name || `v${version.version_number}.0`}
                      </span>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full">
                          current
                        </span>
                      )}
                    </div>
                    {version.description && (
                      <p className="text-zinc-400 text-xs mt-1">{version.description}</p>
                    )}
                    <p className="text-zinc-500 text-xs mt-1 flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(version.created_at)}
                    </p>
                  </div>
                  {index > 0 && (
                    <button
                      onClick={() => handleRestore(version.id)}
                      disabled={restoring === version.id}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-amber-400 transition-colors"
                      title="Restore this version"
                    >
                      {restoring === version.id ? <LoadingSpinner size="sm" /> : <RotateCcw size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {changes.length > 0 && (
          <div className="p-4 border-t border-white/5">
            <h4 className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Recent Changes</h4>
            <div className="space-y-2">
              {changes.slice(0, 10).map(change => (
                <div key={change.id} className="flex items-center gap-2 text-xs">
                  {getChangeIcon(change.change_type)}
                  <span className="text-zinc-400">
                    {change.change_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-zinc-500 ml-auto">
                    {formatDate(change.changed_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// ============================================================================
// MOBILE NAVIGATION
// ============================================================================

const MobileNav = ({ activeView, setActiveView }: { activeView: string; setActiveView: (view: string) => void }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex justify-around md:hidden z-40">
    {[
      { id: 'dashboard', icon: Home, label: 'Home' },
      { id: 'templates', icon: FolderTree, label: 'Templates' },
      { id: 'builder', icon: Layers, label: 'Builder' },
      { id: 'devices', icon: Monitor, label: 'Devices' },
    ].map(item => (
      <button
        key={item.id}
        onClick={() => setActiveView(item.id)}
        className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors
          ${activeView === item.id ? 'text-emerald-400' : 'text-zinc-400'}`}
      >
        <item.icon size={20} />
        <span className="text-[10px]">{item.label}</span>
      </button>
    ))}
  </div>
);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function FolderForgeSync() {
  const { signOut } = useAuth();
  const { templates, loading: templatesLoading, deleteTemplate, createTemplate, updateTemplate } = useTemplates();
  const { devices, loading: devicesLoading, removeDevice } = useDevices();
  const { syncing, isFullySynced, pendingChanges } = useSyncStatus();

  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [shareModalTemplate, setShareModalTemplate] = useState<Template | null>(null);
  const [applyModalTemplate, setApplyModalTemplate] = useState<Template | null>(null);
  const [createTemplateModal, setCreateTemplateModal] = useState(false);
  const [addDeviceModal, setAddDeviceModal] = useState(false);
  const [sampleGalleryOpen, setSampleGalleryOpen] = useState(false);

  // Builder state
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const { folders, folderTree, loading: foldersLoading, addFolder, updateFolder, deleteFolder, moveFolder, moveAndReorderFolder } = useFolders(editingTemplate?.id || null);

  // Undo/Redo functionality
  const { canUndo, canRedo, pushAction, undo, redo } = useUndoRedo();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [wrapExistingOnAdd, setWrapExistingOnAdd] = useState(false);
  const [namingPatternModal, setNamingPatternModal] = useState(false);
  const [importDirectoryModal, setImportDirectoryModal] = useState(false);

  // Drag and drop state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dropMenuState, setDropMenuState] = useState<{
    position: { x: number; y: number };
    draggedId: string;
    targetId: string;
    targetName: string;
  } | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Template stats
  const sharedTemplates = templates.filter(t => t.is_public);
  const collaborativeTemplates = templates.filter(t => t.collaborators && t.collaborators.length > 0);
  const onlineDevices = devices.filter(d => d.is_online);

  // Tree manipulation
  const toggleFolderExpand = useCallback((id: string) => {
    setExpandedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAllFolders = useCallback(() => {
    const allIds = folders.map(f => f.id);
    setExpandedFolderIds(new Set(allIds));
  }, [folders]);

  const collapseAllFolders = useCallback(() => {
    setExpandedFolderIds(new Set());
  }, []);

  // Undo/Redo handlers
  const handleUndo = useCallback(async () => {
    const action = undo();
    if (!action) return;

    try {
      const data = action.data as Record<string, unknown>;
      switch (action.type) {
        case 'add':
          // Undo add = delete the folder
          await deleteFolder(data.folderId as string);
          break;
        case 'delete':
          // Undo delete = restore the folder and its descendants
          const folder = data.folder as FolderType;
          // Restore parent first
          await addFolder({
            name: folder.name,
            parent_id: folder.parent_id,
            folder_type: folder.folder_type,
            sort_order: folder.sort_order,
          });
          break;
        case 'update':
          // Undo rename = restore old name
          await updateFolder(data.folderId as string, { name: data.oldName as string });
          break;
        case 'move':
          // Undo move = restore to old parent
          await moveFolder(data.folderId as string, data.oldParentId as string | null);
          break;
        case 'reorder':
          // Undo reorder = restore to old parent and sort order
          await updateFolder(data.folderId as string, {
            parent_id: data.oldParentId as string | null,
            sort_order: data.oldSortOrder as number,
          });
          break;
      }
    } catch (err) {
      console.error('Failed to undo:', err);
    }
  }, [undo, deleteFolder, addFolder, updateFolder, moveFolder]);

  const handleRedo = useCallback(async () => {
    const action = redo();
    if (!action) return;

    try {
      const data = action.data as Record<string, unknown>;
      switch (action.type) {
        case 'add':
          // Redo add = create the folder again (with same data if possible)
          const folderData = data.folder as FolderType;
          await addFolder({
            name: folderData.name,
            parent_id: folderData.parent_id,
            folder_type: folderData.folder_type,
          });
          break;
        case 'delete':
          // Redo delete = delete again
          const folder = data.folder as FolderType;
          // Find the restored folder by name and parent
          const restoredFolder = folders.find(f =>
            f.name === folder.name && f.parent_id === folder.parent_id
          );
          if (restoredFolder) {
            await deleteFolder(restoredFolder.id);
          }
          break;
        case 'update':
          // Redo rename = apply new name
          await updateFolder(data.folderId as string, { name: data.newName as string });
          break;
        case 'move':
          // Redo move = move to new parent again
          await moveFolder(data.folderId as string, data.newParentId as string | null);
          break;
        case 'reorder':
          // Redo reorder = move to target again
          await moveAndReorderFolder(
            data.folderId as string,
            data.newTargetId as string,
            data.position as 'child' | 'above' | 'below'
          );
          break;
      }
    } catch (err) {
      console.error('Failed to redo:', err);
    }
  }, [redo, addFolder, deleteFolder, updateFolder, moveFolder, moveAndReorderFolder, folders]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're in a template editing context
      if (!editingTemplate) return;

      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingTemplate, handleUndo, handleRedo]);

  const handleAddFolder = useCallback(async (parentId: string | null) => {
    try {
      // Determine actual parent: if 'root' or null, use first root folder as parent
      // This makes "Add Folder" always add as a child, never at root level
      let actualParentId: string | null = parentId;
      if (parentId === 'root' || parentId === null) {
        const rootFolders = folders.filter(f => f.parent_id === null);
        if (rootFolders.length > 0) {
          // Add as child of first root folder
          actualParentId = rootFolders[0].id;
        } else {
          // No root folders exist yet, this shouldn't happen normally
          // but handle gracefully by creating at root level
          actualParentId = null;
        }
      }

      // Get siblings at the target level
      const siblings = folders.filter(f => f.parent_id === actualParentId);
      const siblingsForPattern: FolderForPattern[] = siblings.map(f => ({
        id: f.id,
        name: f.name,
        parent_id: f.parent_id,
        sort_order: f.sort_order,
      }));

      // Get parent hierarchy if using hierarchical numbering
      let parentHierarchy: string | undefined;
      if (actualParentId) {
        const parent = folders.find(f => f.id === actualParentId);
        if (parent) {
          const parsed = parseFolderName(parent.name);
          if (parsed.prefixHierarchy) {
            parentHierarchy = parsed.prefixHierarchy;
          }
        }
      }

      // Generate smart name based on sibling patterns
      const baseName = 'New Folder';
      const smartName = generateNextFolderName(baseName, siblingsForPattern, parentHierarchy);

      const folder = await addFolder({
        name: smartName,
        parent_id: actualParentId,
      });

      // Record undo action
      pushAction({
        type: 'add',
        data: { folderId: folder.id, folder: { ...folder } },
      });

      // Expand the parent folder so the new child is visible
      if (actualParentId) {
        setExpandedFolderIds(prev => new Set([...prev, actualParentId]));
      }
      setEditingFolderId(folder.id);
    } catch (err) {
      console.error('Failed to add folder:', err);
    }
  }, [addFolder, folders, pushAction]);

  const handleDeleteFolder = useCallback(async (id: string) => {
    try {
      // Store folder data for undo before deleting
      const folderToDelete = folders.find(f => f.id === id);
      if (folderToDelete) {
        // Get all descendants to restore if undone
        const getDescendants = (parentId: string): FolderType[] => {
          const children = folders.filter(f => f.parent_id === parentId);
          return children.flatMap(c => [c, ...getDescendants(c.id)]);
        };
        const descendants = getDescendants(id);

        pushAction({
          type: 'delete',
          data: { folder: { ...folderToDelete }, descendants: descendants.map(d => ({ ...d })) },
        });
      }

      await deleteFolder(id);
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  }, [deleteFolder, folders, pushAction]);

  const handleSaveFolderEdit = useCallback(async (id: string, name: string) => {
    try {
      const folder = folders.find(f => f.id === id);
      if (folder && folder.name !== name) {
        pushAction({
          type: 'update',
          data: { folderId: id, oldName: folder.name, newName: name },
        });
      }
      await updateFolder(id, { name });
      setEditingFolderId(null);
    } catch (err) {
      console.error('Failed to update folder:', err);
    }
  }, [updateFolder, folders, pushAction]);

  const handleDeleteTemplate = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplate(id);
      if (editingTemplate?.id === id) {
        setEditingTemplate(null);
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  }, [deleteTemplate, editingTemplate]);

  const handleRenameTemplate = useCallback(async (id: string, newName: string) => {
    try {
      await updateTemplate(id, { name: newName });
    } catch (err) {
      console.error('Failed to rename template:', err);
    }
  }, [updateTemplate]);

  // Move folder to a new parent (for indent/outdent)
  const handleMoveFolder = useCallback(async (id: string, newParentId: string | null) => {
    try {
      const folder = folders.find(f => f.id === id);
      if (folder) {
        pushAction({
          type: 'move',
          data: { folderId: id, oldParentId: folder.parent_id, newParentId, oldSortOrder: folder.sort_order },
        });
      }
      await moveFolder(id, newParentId);
    } catch (err) {
      console.error('Failed to move folder:', err);
    }
  }, [moveFolder, folders, pushAction]);

  // Find folder's parent from flat list
  const findFolderParent = useCallback((folderId: string): FolderType | null => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder?.parent_id) return null;
    return folders.find(f => f.id === folder.parent_id) || null;
  }, [folders]);

  // Find folder's siblings (folders with same parent)
  const findFolderSiblings = useCallback((folderId: string): FolderType[] => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return [];
    return folders.filter(f => f.parent_id === folder.parent_id && f.id !== folderId);
  }, [folders]);

  // Get previous sibling (for outdent - becomes child of previous sibling)
  const getPreviousSibling = useCallback((folderId: string): FolderType | null => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return null;
    const siblings = folders
      .filter(f => f.parent_id === folder.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex(s => s.id === folderId);
    return idx > 0 ? siblings[idx - 1] : null;
  }, [folders]);

  // Indent folder (make it a child of its previous sibling)
  const handleIndentFolder = useCallback(async (folderId: string) => {
    const prevSibling = getPreviousSibling(folderId);
    if (prevSibling) {
      await handleMoveFolder(folderId, prevSibling.id);
      setExpandedFolderIds(prev => new Set([...prev, prevSibling.id]));
    }
  }, [getPreviousSibling, handleMoveFolder]);

  // Outdent folder (move it to parent's level, after parent)
  const handleOutdentFolder = useCallback(async (folderId: string) => {
    const parent = findFolderParent(folderId);
    if (parent) {
      const grandparentId = parent.parent_id;
      await handleMoveFolder(folderId, grandparentId);
    }
  }, [findFolderParent, handleMoveFolder]);

  // Check if a folder can be indented (has a previous sibling to become child of)
  const canIndentFolder = useCallback((folderId: string): boolean => {
    return getPreviousSibling(folderId) !== null;
  }, [getPreviousSibling]);

  // Check if a folder can be outdented (has a parent - i.e., not a root folder)
  const canOutdentFolder = useCallback((folderId: string): boolean => {
    return findFolderParent(folderId) !== null;
  }, [findFolderParent]);

  // Add root folder with option to wrap existing folders
  const handleAddRootFolder = useCallback(async (wrapExisting: boolean) => {
    try {
      // Get root-level siblings for pattern detection
      const rootSiblings = folders.filter(f => f.parent_id === null);
      const siblingsForPattern: FolderForPattern[] = rootSiblings.map(f => ({
        id: f.id,
        name: f.name,
        parent_id: f.parent_id,
        sort_order: f.sort_order,
      }));

      // Generate smart name based on sibling patterns
      const baseName = 'New Folder';
      const smartName = generateNextFolderName(baseName, siblingsForPattern);

      const newRoot = await addFolder({
        name: smartName,
        parent_id: null,
      });

      if (wrapExisting && folderTree.length > 0) {
        // Move all existing root folders under the new root
        const existingRoots = folders.filter(f => f.parent_id === null && f.id !== newRoot.id);
        await Promise.all(
          existingRoots.map(folder => moveFolder(folder.id, newRoot.id))
        );
      }

      setExpandedFolderIds(prev => new Set([...prev, newRoot.id]));
      setEditingFolderId(newRoot.id);
      setWrapExistingOnAdd(false); // Reset checkbox after use
    } catch (err) {
      console.error('Failed to add root folder:', err);
    }
  }, [addFolder, folders, folderTree, moveFolder]);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    // Set initial position from the drag start event
    const { activatorEvent } = event;
    if (activatorEvent instanceof MouseEvent) {
      setDragPosition({ x: activatorEvent.clientX, y: activatorEvent.clientY });
    }
    // Add grabbing cursor to body during drag
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    // Track cursor position during drag for overlay positioning
    const { activatorEvent, delta } = event;
    if (activatorEvent instanceof MouseEvent) {
      setDragPosition({
        x: activatorEvent.clientX + delta.x,
        y: activatorEvent.clientY + delta.y,
      });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Capture cursor position before clearing state
    const lastPosition = dragPosition;

    setActiveDragId(null);
    setDragPosition(null);
    // Restore cursor
    document.body.style.cursor = '';

    if (!over || active.id === over.id) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;
    const targetFolder = folders.find(f => f.id === targetId);

    if (!targetFolder) return;

    // Show context menu at cursor position (or fallback to element position)
    if (lastPosition) {
      setDropMenuState({
        position: { x: lastPosition.x, y: lastPosition.y },
        draggedId,
        targetId,
        targetName: targetFolder.name,
      });
    } else {
      const overElement = document.getElementById(`folder-${targetId}`);
      if (overElement) {
        const rect = overElement.getBoundingClientRect();
        setDropMenuState({
          position: { x: rect.right + 8, y: rect.top },
          draggedId,
          targetId,
          targetName: targetFolder.name,
        });
      }
    }
  }, [folders, dragPosition]);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    setDragPosition(null);
    document.body.style.cursor = '';
  }, []);

  const handleDropMenuSelect = useCallback(async (position: DropPosition) => {
    if (!dropMenuState) return;

    const { draggedId, targetId } = dropMenuState;
    setDropMenuState(null);

    // Get folder state before move for undo
    const draggedFolder = folders.find(f => f.id === draggedId);
    const targetFolder = folders.find(f => f.id === targetId);
    if (!draggedFolder || !targetFolder) return;

    const oldParentId = draggedFolder.parent_id;
    const oldSortOrder = draggedFolder.sort_order;

    try {
      await moveAndReorderFolder(draggedId, targetId, position);

      // Push to undo stack
      pushAction({
        type: 'reorder',
        data: {
          folderId: draggedId,
          oldParentId,
          oldSortOrder,
          newTargetId: targetId,
          position,
        },
      });

      // If inserting as child, expand the target folder to show the moved item
      if (position === 'child') {
        setExpandedFolderIds(prev => new Set([...prev, targetId]));
      }
    } catch (err) {
      console.error('Failed to move folder:', err);
    }
  }, [dropMenuState, moveAndReorderFolder, folders, pushAction]);

  const handleDropMenuClose = useCallback(() => {
    setDropMenuState(null);
  }, []);

  // Get the folder being dragged for preview
  const activeDragFolder = activeDragId ? folders.find(f => f.id === activeDragId) : undefined;

  // Import directory structure as a new template
  const handleImportDirectory = useCallback(async (structure: ScannedFolder, templateName: string) => {
    // Create a new template
    const template = await createTemplate({
      name: templateName,
      description: `Imported from ${structure.path}`,
      color: 'cyan',
      icon_type: 'default',
    });

    // Switch to editing the new template
    setEditingTemplate(template);
    setActiveView('builder');

    // Helper to recursively add folders
    const addFoldersRecursively = async (
      nodes: ScannedFolder[],
      parentId: string | null,
      sortStart: number = 0
    ) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const folder = await addFolder({
          name: node.name,
          parent_id: parentId,
        });

        // Expand the folder to show children
        if (node.children && node.children.length > 0) {
          setExpandedFolderIds(prev => new Set([...prev, folder.id]));
          await addFoldersRecursively(node.children, folder.id, 0);
        }
      }
    };

    // Add all folders from the imported structure
    if (structure.children && structure.children.length > 0) {
      await addFoldersRecursively(structure.children, null, 0);
    }
  }, [createTemplate, addFolder]);

  // Render Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Templates', value: templates.length, icon: FolderTree, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { label: 'Devices', value: `${onlineDevices.length}/${devices.length}`, icon: Monitor, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { label: 'Shared', value: sharedTemplates.length, icon: Share2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Collaborations', value: collaborativeTemplates.length, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/20' },
        ].map(stat => (
          <GlassCard key={stat.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <SyncPulse syncing={syncing} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-zinc-400 text-sm">{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Templates</h2>
          <button
            onClick={() => setActiveView('templates')}
            className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </button>
        </div>

        {templatesLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No templates yet"
            description="Create your first folder template to get started"
            action={{ label: 'Create Template', onClick: () => setCreateTemplateModal(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.slice(0, 3).map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={setSelectedTemplateId}
                onShare={setShareModalTemplate}
                onApply={setApplyModalTemplate}
                onEdit={(t) => { setEditingTemplate(t); setActiveView('builder'); }}
                onDelete={handleDeleteTemplate}
                onRename={handleRenameTemplate}
                selected={selectedTemplateId === template.id}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Connected Devices</h2>
          <button
            onClick={() => setAddDeviceModal(true)}
            className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Plus size={14} /> Add Device
          </button>
        </div>

        {devicesLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : devices.length === 0 ? (
          <EmptyState
            icon={Monitor}
            title="No devices connected"
            description="Add a device to start syncing your folder templates"
            action={{ label: 'Add Device', onClick: () => setAddDeviceModal(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {devices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                onRemove={removeDevice}
                onSync={(id) => console.log('Syncing device', id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render Templates
  const renderTemplates = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSampleGalleryOpen(true)}
            className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-xl text-sm text-amber-400 font-medium flex items-center gap-2"
          >
            <Sparkles size={16} /> Browse Samples
          </button>
          <button
            onClick={() => setImportDirectoryModal(true)}
            className="px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-xl text-sm text-cyan-400 font-medium flex items-center gap-2"
          >
            <Upload size={16} /> Import Directory
          </button>
          <button
            onClick={() => setCreateTemplateModal(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm text-white font-medium flex items-center gap-2"
          >
            <Plus size={16} /> New Template
          </button>
        </div>
      </div>

      {templatesLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No templates yet"
          description="Create your first folder template to organize your projects"
          action={{ label: 'Create Template', onClick: () => setCreateTemplateModal(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates
            .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={setSelectedTemplateId}
                onShare={setShareModalTemplate}
                onApply={setApplyModalTemplate}
                onEdit={(t) => { setEditingTemplate(t); setActiveView('builder'); }}
                onDelete={handleDeleteTemplate}
                onRename={handleRenameTemplate}
                selected={selectedTemplateId === template.id}
              />
            ))}
        </div>
      )}
    </div>
  );

  // Render Builder
  const renderBuilder = () => (
    <div className="space-y-6">
      {!editingTemplate ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Select a Template to Edit</h2>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No templates to edit"
              description="Create a template first to start building your folder structure"
              action={{ label: 'Create Template', onClick: () => setCreateTemplateModal(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <GlassCard
                  key={template.id}
                  className="p-4"
                  onClick={() => setEditingTemplate(template)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <FolderTree size={20} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{template.name}</p>
                      <p className="text-zinc-400 text-xs">{template.folder_count} folders</p>
                    </div>
                    <ArrowRight size={18} className="text-zinc-400" />
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GlassCard className="p-4" hover={false}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="p-2 hover:bg-white/10 rounded-lg text-zinc-400"
                  >
                    <ChevronRight size={20} className="rotate-180" />
                  </button>
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <FolderTree size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{editingTemplate.name}</h3>
                    <p className="text-zinc-400 text-xs">{editingTemplate.folder_count} folders • {editingTemplate.max_depth} levels</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SyncPulse syncing={syncing} />
                  <span className="text-xs text-zinc-400">Auto-saving</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <button
                  onClick={() => handleAddRootFolder(wrapExistingOnAdd)}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <FolderPlus size={14} /> Add Root Folder
                </button>
                {folderTree.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={wrapExistingOnAdd}
                      onChange={(e) => setWrapExistingOnAdd(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    Wrap existing under this root
                  </label>
                )}
                <div className="h-4 w-px bg-white/10" />
                <button
                  onClick={() => handleAddFolder(selectedFolderId)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  title={selectedFolderId
                    ? 'Add as child of selected folder'
                    : folderTree.length > 0
                      ? `Add as child of "${folderTree[0].name}"`
                      : 'Add a folder'
                  }
                  disabled={folderTree.length === 0}
                >
                  <Plus size={14} /> Add Folder {selectedFolderId ? 'Here' : ''}
                </button>

                {/* Expand/Collapse All */}
                {folderTree.length > 0 && (
                  <>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={expandAllFolders}
                        className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
                        title="Expand all folders"
                      >
                        <Maximize2 size={14} />
                      </button>
                      <button
                        onClick={collapseAllFolders}
                        className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
                        title="Collapse all folders"
                      >
                        <Minimize2 size={14} />
                      </button>
                    </div>
                  </>
                )}

                {/* Undo/Redo */}
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className={`p-1.5 rounded-lg transition-colors ${
                      canUndo
                        ? 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
                        : 'text-zinc-600 cursor-not-allowed'
                    }`}
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className={`p-1.5 rounded-lg transition-colors ${
                      canRedo
                        ? 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
                        : 'text-zinc-600 cursor-not-allowed'
                    }`}
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 size={14} />
                  </button>
                </div>
              </div>

              {foldersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : folderTree.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <Folder size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No folders yet</p>
                  <p className="text-xs mt-1">Click "Add Root Folder" to start building</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={pointerWithin}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <div className="overflow-auto max-h-96 lg:max-h-[500px]">
                    <SortableContext
                      items={folders.map(f => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {folderTree.map(node => (
                        <DraggableTreeNode
                          key={node.id}
                          node={node}
                          onToggle={toggleFolderExpand}
                          onSelect={setSelectedFolderId}
                          onAdd={handleAddFolder}
                          onDelete={handleDeleteFolder}
                          onEdit={setEditingFolderId}
                          selectedId={selectedFolderId}
                          editingId={editingFolderId}
                          onEditSave={handleSaveFolderEdit}
                          expandedIds={expandedFolderIds}
                          onIndent={handleIndentFolder}
                          onOutdent={handleOutdentFolder}
                          canIndent={canIndentFolder}
                          canOutdent={canOutdentFolder}
                        />
                      ))}
                    </SortableContext>
                  </div>

                </DndContext>
              )}

              {/* Custom drag overlay - portal to body, positioned exactly at cursor */}
              {activeDragId && activeDragFolder && dragPosition && createPortal(
                <div
                  className="fixed z-[9999] flex items-center gap-2 px-3 py-2 bg-zinc-800/95 border border-emerald-500 rounded-lg shadow-2xl pointer-events-none"
                  style={{
                    left: dragPosition.x,
                    top: dragPosition.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <FolderIcon type={activeDragFolder.folder_type} size={16} />
                  <span className="text-sm text-white font-medium">{activeDragFolder.name}</span>
                </div>,
                document.body
              )}
            </GlassCard>
          </div>

          <div className="space-y-4">
            <GlassCard className="p-4" hover={false}>
              <h3 className="text-white font-medium mb-4">Folder Properties</h3>
              {selectedFolderId ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Folder Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { type: 'default', icon: Folder, color: 'bg-amber-500/20 text-amber-400' },
                        { type: 'code', icon: Code, color: 'bg-emerald-500/20 text-emerald-400' },
                        { type: 'docs', icon: FileText, color: 'bg-blue-500/20 text-blue-400' },
                        { type: 'media', icon: Image, color: 'bg-pink-500/20 text-pink-400' },
                      ].map(item => (
                        <button
                          key={item.type}
                          onClick={() => updateFolder(selectedFolderId, { folder_type: item.type as FolderType['folder_type'] })}
                          className={`p-3 rounded-xl ${item.color} hover:scale-105 transition-transform`}
                        >
                          <item.icon size={18} className="mx-auto" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">Adjust Level</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOutdentFolder(selectedFolderId)}
                        disabled={!canOutdentFolder(selectedFolderId)}
                        className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors ${
                          canOutdentFolder(selectedFolderId)
                            ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
                            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                        }`}
                        title="Move folder up one level"
                      >
                        <ChevronsLeft size={16} />
                        <span className="text-xs">Outdent</span>
                      </button>
                      <button
                        onClick={() => handleIndentFolder(selectedFolderId)}
                        disabled={!canIndentFolder(selectedFolderId)}
                        className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors ${
                          canIndentFolder(selectedFolderId)
                            ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
                            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                        }`}
                        title="Move folder down one level"
                      >
                        <ChevronsRight size={16} />
                        <span className="text-xs">Indent</span>
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1.5">
                      {!canOutdentFolder(selectedFolderId) && !canIndentFolder(selectedFolderId)
                        ? 'This folder cannot be moved'
                        : 'Change the folder\'s position in the hierarchy'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">Select a folder to edit its properties</p>
              )}
            </GlassCard>

            <GlassCard className="p-4" hover={false}>
              <h3 className="text-white font-medium mb-4">Template Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setApplyModalTemplate(editingTemplate)}
                  className="w-full flex items-center gap-3 p-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl transition-colors text-emerald-400"
                >
                  <Download size={18} />
                  <span className="text-sm font-medium">Apply to Device</span>
                </button>
                <button
                  onClick={() => setShareModalTemplate(editingTemplate)}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-zinc-300"
                >
                  <Share2 size={18} />
                  <span className="text-sm">Share Template</span>
                </button>
                <button
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    showVersionHistory
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                  }`}
                >
                  <History size={18} />
                  <span className="text-sm">Version History</span>
                </button>
                {/* Naming Patterns with controls */}
                {(() => {
                  const patternInfo = analyzeTreePattern(
                    folders.map(f => ({ id: f.id, name: f.name, parent_id: f.parent_id, sort_order: f.sort_order }))
                  );
                  const foldersForPattern: FolderForPattern[] = folders.map(f => ({
                    id: f.id,
                    name: f.name,
                    parent_id: f.parent_id,
                    sort_order: f.sort_order,
                  }));

                  return (
                    <div className="space-y-2">
                      <button
                        onClick={() => setNamingPatternModal(true)}
                        disabled={folders.length === 0}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors text-zinc-300"
                      >
                        <Tag size={18} />
                        <div className="flex-1 text-left">
                          <span className="text-sm">Naming Patterns</span>
                          {patternInfo.hasPattern && (
                            <p className="text-xs text-emerald-400 mt-0.5">
                              {patternInfo.affectedCount}/{patternInfo.totalCount} have prefixes
                            </p>
                          )}
                        </div>
                      </button>

                      {/* Quick Actions */}
                      {folders.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={async () => {
                              const updates = renumberFoldersByPosition(foldersForPattern, {
                                mode: 'numeric',
                                padLength: 2,
                                separator: '_',
                              });
                              if (updates.length === 0) return;
                              try {
                                await Promise.all(
                                  updates.map(u => updateFolder(u.id, { name: u.newName }))
                                );
                              } catch (err) {
                                console.error('Failed to renumber:', err);
                              }
                            }}
                            className="flex items-center justify-center gap-1.5 p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-400 text-xs"
                            title="Number folders by position (01_, 02_...)"
                          >
                            <Hash size={12} />
                            <span>Renumber</span>
                          </button>
                          <button
                            onClick={async () => {
                              const updates = renumberFoldersByPosition(foldersForPattern, {
                                mode: 'hierarchy',
                                padLength: 2,
                                separator: '_',
                              });
                              if (updates.length === 0) return;
                              try {
                                await Promise.all(
                                  updates.map(u => updateFolder(u.id, { name: u.newName }))
                                );
                              } catch (err) {
                                console.error('Failed to renumber:', err);
                              }
                            }}
                            className="flex items-center justify-center gap-1.5 p-2 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-colors text-cyan-400 text-xs"
                            title="Hierarchy numbering (01.01_, 01.02_...)"
                          >
                            <Layers size={12} />
                            <span>Hierarchy</span>
                          </button>
                        </div>
                      )}

                      {patternInfo.hasPattern && (
                        <button
                          onClick={async () => {
                            try {
                              await Promise.all(
                                folders.map(f => {
                                  const stripped = stripPrefixSuffix(f.name);
                                  if (stripped !== f.name) {
                                    return updateFolder(f.id, { name: stripped });
                                  }
                                  return Promise.resolve();
                                })
                              );
                            } catch (err) {
                              console.error('Failed to strip prefixes:', err);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 p-2 bg-zinc-500/10 hover:bg-zinc-500/20 rounded-lg transition-colors text-zinc-400 text-xs"
                        >
                          <X size={12} />
                          <span>Clear All Prefixes</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </GlassCard>

            {showVersionHistory && editingTemplate && (
              <div className="lg:hidden">
                <VersionHistoryPanel
                  templateId={editingTemplate.id}
                  onRestore={() => {}}
                  onClose={() => setShowVersionHistory(false)}
                />
              </div>
            )}
          </div>

          {showVersionHistory && editingTemplate && (
            <div className="hidden lg:block w-80">
              <VersionHistoryPanel
                templateId={editingTemplate.id}
                onRestore={() => {}}
                onClose={() => setShowVersionHistory(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render Devices
  const renderDevices = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Your Devices</h2>
          <p className="text-zinc-400 text-sm">Manage connected devices and sync settings</p>
        </div>
        <button
          onClick={() => setAddDeviceModal(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm text-white font-medium flex items-center gap-2"
        >
          <Plus size={16} /> Add Device
        </button>
      </div>

      {devicesLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : devices.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="No devices connected"
          description="Add your first device to start syncing folder templates across computers"
          action={{ label: 'Add Device', onClick: () => setAddDeviceModal(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onRemove={removeDevice}
              onSync={(id) => console.log('Syncing device', id)}
              showToken
            />
          ))}
        </div>
      )}

      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Download Desktop Agent</h3>
          <span className="text-xs text-zinc-500">v1.0.0</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/10 rounded-xl">
          <div className="p-4 bg-emerald-500/20 rounded-full mb-4">
            <Download size={32} className="text-emerald-400" />
          </div>
          <p className="text-white font-medium mb-2">Get the FolderForge Agent</p>
          <p className="text-zinc-400 text-sm text-center max-w-sm mb-4">
            Install the desktop agent on your computer to enable real-time sync and automatic folder creation.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://github.com/Sean4E/folderforge-sync/releases/download/v1.0.0/FolderForge-Sync-Setup-Windows.exe"
              className="px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm text-blue-400 flex items-center gap-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Monitor size={16} /> Windows (.exe)
            </a>
            <a
              href="https://github.com/Sean4E/folderforge-sync/releases/tag/v1.0.0"
              className="px-4 py-2.5 bg-zinc-500/20 hover:bg-zinc-500/30 border border-zinc-500/30 rounded-lg text-sm text-zinc-300 flex items-center gap-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Laptop size={16} /> macOS (coming soon)
            </a>
            <a
              href="https://github.com/Sean4E/folderforge-sync/releases/tag/v1.0.0"
              className="px-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-sm text-orange-400 flex items-center gap-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Monitor size={16} /> Linux (coming soon)
            </a>
          </div>
          <p className="text-zinc-500 text-xs mt-4">
            After installing, use the device token from above to connect.
          </p>
        </div>

        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-400 font-medium mb-1">Setup Instructions</p>
              <ol className="text-zinc-400 space-y-1 list-decimal list-inside">
                <li>Download and install the desktop agent for your OS</li>
                <li>Register a new device above to get a device token</li>
                <li>Open the desktop agent settings and paste your token</li>
                <li>Enter your Supabase URL and anon key</li>
                <li>Click "Test Connection" to verify</li>
              </ol>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );

  const views: Record<string, () => JSX.Element> = {
    dashboard: renderDashboard,
    templates: renderTemplates,
    builder: renderBuilder,
    devices: renderDevices,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-900/80 backdrop-blur-xl border-b border-white/10 z-30 px-4">
        <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="FolderForge" className="w-12 h-12" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white">
                  Folder<span className="text-emerald-400">Forge</span>
                </h1>
                <p className="text-xs text-amber-400 -mt-0.5 font-medium tracking-wide">Sync</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full">
              <SyncPulse syncing={syncing} />
              <span className="text-xs text-emerald-400">
                {isFullySynced ? 'All synced' : `${pendingChanges} pending`}
              </span>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-lg relative">
              <Bell size={20} className="text-zinc-400" />
              {pendingChanges > 0 && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
            <ProfileMenu onSignOut={() => signOut()} />
          </div>
        </div>
      </header>

      <aside className={`fixed left-0 top-16 bottom-0 w-64 bg-zinc-900/50 backdrop-blur-xl border-r border-white/10 p-4 hidden md:block transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav className="space-y-1">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'templates', icon: FolderTree, label: 'Templates' },
            { id: 'builder', icon: Layers, label: 'Template Builder' },
            { id: 'devices', icon: Monitor, label: 'Devices' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${activeView === item.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
            >
              <item.icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <GlassCard className="p-4" hover={false}>
            <div className="flex items-center gap-3 mb-3">
              <Cloud size={20} className="text-emerald-400" />
              <span className="text-sm text-white font-medium">Cloud Status</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Templates synced</span>
                <span className="text-emerald-400">{templates.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Devices online</span>
                <span className="text-emerald-400">{onlineDevices.length}/{devices.length}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </aside>

      <main className={`pt-20 pb-24 md:pb-8 px-4 md:px-8 transition-all ${sidebarOpen ? 'md:ml-64' : ''}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-6 text-sm">
            <button onClick={() => setActiveView('dashboard')} className="text-zinc-400 hover:text-white">Home</button>
            <ChevronRight size={14} className="text-zinc-600" />
            <span className="text-white capitalize">{activeView}</span>
            {editingTemplate && activeView === 'builder' && (
              <>
                <ChevronRight size={14} className="text-zinc-600" />
                <span className="text-emerald-400">{editingTemplate.name}</span>
              </>
            )}
          </div>

          {views[activeView]?.()}
        </div>
      </main>

      <MobileNav activeView={activeView} setActiveView={setActiveView} />

      {shareModalTemplate && (
        <ShareModal
          template={shareModalTemplate}
          onClose={() => setShareModalTemplate(null)}
        />
      )}

      {applyModalTemplate && (
        <ApplyModal
          template={applyModalTemplate}
          onClose={() => setApplyModalTemplate(null)}
        />
      )}

      {createTemplateModal && (
        <CreateTemplateModal
          onClose={() => setCreateTemplateModal(false)}
          onCreated={(template) => {
            setCreateTemplateModal(false);
            setEditingTemplate(template);
            setActiveView('builder');
          }}
        />
      )}

      {addDeviceModal && (
        <AddDeviceModal
          onClose={() => setAddDeviceModal(false)}
          onCreated={() => {}}
        />
      )}

      {sampleGalleryOpen && (
        <SampleTemplatesGallery
          onClose={() => setSampleGalleryOpen(false)}
          onClone={async (templateId) => {
            console.log('onClone called with templateId:', templateId);
            // Close modal first, let real-time sync pick up the template
            setSampleGalleryOpen(false);

            // Wait a moment for real-time subscription to update
            await new Promise(resolve => setTimeout(resolve, 500));

            // Find the template in the current list (should be added by real-time)
            const newTemplate = templates.find(t => t.id === templateId);
            console.log('Found template in list:', newTemplate);

            if (newTemplate) {
              setEditingTemplate(newTemplate);
              setActiveView('builder');
            } else {
              // Template not in list yet, just go to templates view
              // User can click on it when it appears
              setActiveView('templates');
              console.log('Template not found yet, navigating to templates view');
            }
          }}
        />
      )}

      {namingPatternModal && editingTemplate && (
        <NamingPatternModal
          folders={folders.map(f => ({
            id: f.id,
            name: f.name,
            parent_id: f.parent_id,
            sort_order: f.sort_order,
          }))}
          selectedFolderIds={selectedFolderId ? [selectedFolderId] : []}
          onApply={async (updates) => {
            // Batch updates for better performance
            await Promise.all(
              updates.map(update => updateFolder(update.id, { name: update.name }))
            );
          }}
          onClose={() => setNamingPatternModal(false)}
        />
      )}

      {dropMenuState && (
        <DropContextMenu
          position={dropMenuState.position}
          targetName={dropMenuState.targetName}
          onSelect={handleDropMenuSelect}
          onClose={handleDropMenuClose}
        />
      )}

      {importDirectoryModal && (
        <ImportDirectoryModal
          onImport={handleImportDirectory}
          onClose={() => setImportDirectoryModal(false)}
          onOpenNamingPatterns={() => {
            setImportDirectoryModal(false);
            setNamingPatternModal(true);
          }}
        />
      )}
    </div>
  );
}
