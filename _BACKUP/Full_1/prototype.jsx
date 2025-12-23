import React, { useState, useEffect, useCallback } from 'react';
import { Folder, FolderPlus, FolderTree, Monitor, Smartphone, Laptop, Cloud, CloudOff, Share2, Copy, Users, Plus, Trash2, Edit3, Check, X, ChevronRight, ChevronDown, Settings, Home, Layout, Link2, UserPlus, RefreshCw, Download, Upload, Search, MoreVertical, Wifi, WifiOff, Clock, CheckCircle, AlertCircle, Menu, Bell, User, LogOut, Layers, GitBranch, Eye, EyeOff, Lock, Unlock, Globe, Send, ArrowRight, FolderOpen, FileText, Image, Film, Music, Code, Archive, Database, Palette, Zap, Target, Star, Heart, Bookmark, Tag, Filter, Grid, List, Move, ChevronLeft } from 'lucide-react';

// Simulated real-time sync indicator
const SyncPulse = ({ syncing }) => (
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

// Device status indicator
const DeviceStatus = ({ online, lastSync }) => (
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
    {lastSync && (
      <span className="text-zinc-500 text-xs">• {lastSync}</span>
    )}
  </div>
);

// Glassmorphism card component
const GlassCard = ({ children, className = '', hover = true, onClick }) => (
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

// Folder icon with type-based coloring
const FolderIcon = ({ type = 'default', size = 20, open = false }) => {
  const colors = {
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

// Animated folder tree node
const TreeNode = ({ node, level = 0, onToggle, onSelect, onAdd, onDelete, onEdit, selectedId, editingId, onEditSave }) => {
  const [editName, setEditName] = useState(node.name);
  const isEditing = editingId === node.id;
  
  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded-lg group
          ${selectedId === node.id ? 'bg-white/10' : 'hover:bg-white/5'}
          transition-all duration-200
        `}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {node.children?.length > 0 ? (
          <button onClick={() => onToggle(node.id)} className="p-0.5 hover:bg-white/10 rounded">
            {node.expanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        <FolderIcon type={node.type} open={node.expanded} />
        
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
              className="text-sm text-zinc-200 flex-1 cursor-pointer"
              onClick={() => onSelect(node.id)}
            >
              {node.name}
            </span>
            
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
      
      {node.expanded && node.children?.map(child => (
        <TreeNode
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
        />
      ))}
    </div>
  );
};

// Template card for grid view
const TemplateCard = ({ template, onSelect, onShare, onApply, selected }) => (
  <GlassCard 
    className={`p-4 ${selected ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : ''}`}
    onClick={() => onSelect(template.id)}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl ${template.color || 'bg-amber-500/20'}`}>
        <FolderTree size={22} className={template.iconColor || 'text-amber-400'} />
      </div>
      <div className="flex items-center gap-1">
        {template.shared && (
          <div className="p-1.5 bg-blue-500/20 rounded-lg" title="Shared template">
            <Users size={12} className="text-blue-400" />
          </div>
        )}
        {template.collaborative && (
          <div className="p-1.5 bg-purple-500/20 rounded-lg" title="Collaborative">
            <GitBranch size={12} className="text-purple-400" />
          </div>
        )}
      </div>
    </div>
    
    <h3 className="text-white font-medium mb-1">{template.name}</h3>
    <p className="text-zinc-400 text-xs mb-3">{template.folders} folders • {template.depth} levels</p>
    
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">Updated {template.updated}</span>
      <div className="flex items-center gap-2">
        <SyncPulse syncing={template.syncing} />
      </div>
    </div>
    
    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
      <button 
        onClick={(e) => { e.stopPropagation(); onApply(template.id); }}
        className="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
      >
        <Download size={12} /> Apply
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onShare(template.id); }}
        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
      >
        <Share2 size={12} /> Share
      </button>
    </div>
  </GlassCard>
);

// Device card
const DeviceCard = ({ device, onRemove, onSync }) => {
  const icons = {
    desktop: Monitor,
    laptop: Laptop,
    mobile: Smartphone,
  };
  const Icon = icons[device.type] || Monitor;
  
  return (
    <GlassCard className="p-4" hover={false}>
      <div className="flex items-start gap-3">
        <div className={`p-3 rounded-xl ${device.online ? 'bg-emerald-500/20' : 'bg-zinc-500/20'}`}>
          <Icon size={24} className={device.online ? 'text-emerald-400' : 'text-zinc-400'} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">{device.name}</h3>
            {device.current && (
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full">This device</span>
            )}
          </div>
          <DeviceStatus online={device.online} lastSync={device.lastSync} />
          <p className="text-zinc-500 text-xs mt-1 truncate">{device.path}</p>
        </div>
        
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => onSync(device.id)}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
            title="Force sync"
          >
            <RefreshCw size={16} />
          </button>
          {!device.current && (
            <button 
              onClick={() => onRemove(device.id)}
              className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
              title="Remove device"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

// Share modal
const ShareModal = ({ template, onClose, onShare }) => {
  const [mode, setMode] = useState('copy'); // 'copy' or 'collaborate'
  const [email, setEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const shareLink = `https://folderforge.app/share/${template?.id || 'abc123'}`;
  
  const copyLink = () => {
    navigator.clipboard?.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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
        
        {/* Mode selector */}
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
            
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="allowEdits" className="rounded bg-white/10 border-white/20" />
                <label htmlFor="allowEdits" className="text-sm text-zinc-300">Allow recipients to see updates</label>
              </div>
            </div>
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
              />
              <button className="px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm transition-colors flex items-center gap-2">
                <Send size={16} /> Invite
              </button>
            </div>
            
            <div className="space-y-2 pt-4 border-t border-white/10">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Collaborators</p>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    S
                  </div>
                  <div>
                    <p className="text-sm text-white">You</p>
                    <p className="text-xs text-zinc-500">Owner</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">Owner</span>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

// Apply template modal
const ApplyModal = ({ template, devices, onClose, onApply }) => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [customPath, setCustomPath] = useState('');
  
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
        
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-6">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <FolderTree size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-white font-medium">{template.name}</p>
            <p className="text-zinc-400 text-xs">{template.folders} folders • {template.depth} levels</p>
          </div>
        </div>
        
        <p className="text-sm text-zinc-400 mb-3">Select target device:</p>
        
        <div className="space-y-2 mb-4">
          {devices.filter(d => d.online).map(device => (
            <button
              key={device.id}
              onClick={() => setSelectedDevice(device.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all
                ${selectedDevice === device.id 
                  ? 'bg-emerald-500/10 border-emerald-500' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'}`}
            >
              <Monitor size={20} className={selectedDevice === device.id ? 'text-emerald-400' : 'text-zinc-400'} />
              <div className="text-left flex-1">
                <p className={`text-sm ${selectedDevice === device.id ? 'text-emerald-400' : 'text-white'}`}>{device.name}</p>
                <p className="text-xs text-zinc-500">{device.path}</p>
              </div>
              {selectedDevice === device.id && <Check size={18} className="text-emerald-400" />}
            </button>
          ))}
        </div>
        
        <div className="mb-6">
          <label className="text-sm text-zinc-400 mb-2 block">Custom path (optional):</label>
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="/path/to/create/folders"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        
        <button 
          onClick={() => onApply(template.id, selectedDevice, customPath)}
          disabled={!selectedDevice}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Download size={18} /> Create Folders
        </button>
      </GlassCard>
    </div>
  );
};

// Mobile navigation
const MobileNav = ({ activeView, setActiveView, setMobileMenuOpen }) => (
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

// Main App Component
export default function FolderForgeSync() {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [sharingTemplate, setSharingTemplate] = useState(null);
  const [applyingTemplate, setApplyingTemplate] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sample data
  const [templates, setTemplates] = useState([
    { id: 1, name: 'Web Project', folders: 24, depth: 4, updated: '2 min ago', syncing: true, color: 'bg-blue-500/20', iconColor: 'text-blue-400' },
    { id: 2, name: 'Video Production', folders: 18, depth: 3, updated: '1 hour ago', syncing: false, shared: true, color: 'bg-pink-500/20', iconColor: 'text-pink-400' },
    { id: 3, name: 'Client Project', folders: 32, depth: 5, updated: '3 hours ago', syncing: false, collaborative: true, color: 'bg-purple-500/20', iconColor: 'text-purple-400' },
    { id: 4, name: 'Blender Assets', folders: 15, depth: 3, updated: 'Yesterday', syncing: false, color: 'bg-orange-500/20', iconColor: 'text-orange-400' },
    { id: 5, name: 'Course Materials', folders: 42, depth: 4, updated: '2 days ago', syncing: false, shared: true, color: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
    { id: 6, name: 'Archive Structure', folders: 8, depth: 2, updated: '1 week ago', syncing: false, color: 'bg-zinc-500/20', iconColor: 'text-zinc-400' },
  ]);
  
  const [devices, setDevices] = useState([
    { id: 1, name: 'Main Workstation', type: 'desktop', online: true, current: true, lastSync: 'Just now', path: 'C:/Projects' },
    { id: 2, name: 'MacBook Pro', type: 'laptop', online: true, current: false, lastSync: '5 min ago', path: '/Users/sean/Projects' },
    { id: 3, name: 'School PC', type: 'desktop', online: false, current: false, lastSync: '2 days ago', path: 'D:/Work' },
  ]);
  
  const [folderTree, setFolderTree] = useState([
    {
      id: 'root',
      name: 'Project Root',
      type: 'default',
      expanded: true,
      children: [
        {
          id: 'assets',
          name: 'Assets',
          type: 'assets',
          expanded: true,
          children: [
            { id: 'images', name: 'Images', type: 'media', expanded: false, children: [] },
            { id: 'fonts', name: 'Fonts', type: 'assets', expanded: false, children: [] },
            { id: 'icons', name: 'Icons', type: 'assets', expanded: false, children: [] },
          ]
        },
        {
          id: 'src',
          name: 'Source',
          type: 'code',
          expanded: true,
          children: [
            { id: 'components', name: 'Components', type: 'code', expanded: false, children: [] },
            { id: 'utils', name: 'Utils', type: 'code', expanded: false, children: [] },
            { id: 'styles', name: 'Styles', type: 'code', expanded: false, children: [] },
          ]
        },
        {
          id: 'docs',
          name: 'Documentation',
          type: 'docs',
          expanded: false,
          children: [
            { id: 'api', name: 'API Docs', type: 'docs', expanded: false, children: [] },
            { id: 'guides', name: 'Guides', type: 'docs', expanded: false, children: [] },
          ]
        },
        {
          id: 'exports',
          name: 'Exports',
          type: 'archive',
          expanded: false,
          children: []
        },
      ]
    }
  ]);
  
  // Tree manipulation functions
  const toggleNode = (nodeId) => {
    const updateTree = (nodes) => nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children) {
        return { ...node, children: updateTree(node.children) };
      }
      return node;
    });
    setFolderTree(updateTree(folderTree));
  };
  
  const addNode = (parentId) => {
    const newNode = {
      id: `folder-${Date.now()}`,
      name: 'New Folder',
      type: 'default',
      expanded: false,
      children: []
    };
    
    const updateTree = (nodes) => nodes.map(node => {
      if (node.id === parentId) {
        return { ...node, expanded: true, children: [...(node.children || []), newNode] };
      }
      if (node.children) {
        return { ...node, children: updateTree(node.children) };
      }
      return node;
    });
    setFolderTree(updateTree(folderTree));
    setEditingNode(newNode.id);
  };
  
  const deleteNode = (nodeId) => {
    const updateTree = (nodes) => nodes.filter(node => {
      if (node.id === nodeId) return false;
      if (node.children) {
        node.children = updateTree(node.children);
      }
      return true;
    });
    setFolderTree(updateTree(folderTree));
  };
  
  const saveNodeEdit = (nodeId, newName) => {
    const updateTree = (nodes) => nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, name: newName };
      }
      if (node.children) {
        return { ...node, children: updateTree(node.children) };
      }
      return node;
    });
    setFolderTree(updateTree(folderTree));
    setEditingNode(null);
  };
  
  // Simulate sync
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncing(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  const handleShare = (templateId) => {
    setSharingTemplate(templates.find(t => t.id === templateId));
    setShareModalOpen(true);
  };
  
  const handleApply = (templateId) => {
    setApplyingTemplate(templates.find(t => t.id === templateId));
    setApplyModalOpen(true);
  };
  
  // Render different views
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Templates', value: templates.length, icon: FolderTree, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { label: 'Devices', value: devices.filter(d => d.online).length + '/' + devices.length, icon: Monitor, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { label: 'Shared', value: templates.filter(t => t.shared).length, icon: Share2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Collaborations', value: templates.filter(t => t.collaborative).length, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/20' },
        ].map(stat => (
          <GlassCard key={stat.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <SyncPulse syncing={syncing && stat.label === 'Templates'} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-zinc-400 text-sm">{stat.label}</p>
          </GlassCard>
        ))}
      </div>
      
      {/* Recent templates */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.slice(0, 3).map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={setSelectedTemplate}
              onShare={handleShare}
              onApply={handleApply}
              selected={selectedTemplate === template.id}
            />
          ))}
        </div>
      </div>
      
      {/* Devices */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Connected Devices</h2>
          <button className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            <Plus size={14} /> Add Device
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onRemove={(id) => setDevices(devices.filter(d => d.id !== id))}
              onSync={(id) => console.log('Syncing device', id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
  
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
          <button className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-zinc-300 flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
          <button 
            onClick={() => setActiveView('builder')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm text-white font-medium flex items-center gap-2"
          >
            <Plus size={16} /> New Template
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates
          .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={setSelectedTemplate}
              onShare={handleShare}
              onApply={handleApply}
              selected={selectedTemplate === template.id}
            />
          ))}
      </div>
    </div>
  );
  
  const renderBuilder = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left panel - Tree */}
      <div className="lg:col-span-2">
        <GlassCard className="p-4 h-full" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <FolderTree size={20} className="text-amber-400" />
              </div>
              <div>
                <input
                  type="text"
                  defaultValue="Web Project"
                  className="bg-transparent text-white font-semibold text-lg focus:outline-none border-b border-transparent focus:border-emerald-500"
                />
                <p className="text-zinc-400 text-xs">24 folders • 4 levels deep</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SyncPulse syncing={syncing} />
              <span className="text-xs text-zinc-400">Auto-saving</span>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4 pb-4 border-b border-white/10">
            <button 
              onClick={() => addNode('root')}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <FolderPlus size={14} /> Add Folder
            </button>
            <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5">
              <Upload size={14} /> Import
            </button>
            <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5">
              <Download size={14} /> Export
            </button>
          </div>
          
          <div className="overflow-auto max-h-96 lg:max-h-[500px]">
            {folderTree.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                onToggle={toggleNode}
                onSelect={setSelectedNode}
                onAdd={addNode}
                onDelete={deleteNode}
                onEdit={setEditingNode}
                selectedId={selectedNode}
                editingId={editingNode}
                onEditSave={saveNodeEdit}
              />
            ))}
          </div>
        </GlassCard>
      </div>
      
      {/* Right panel - Properties */}
      <div className="space-y-4">
        <GlassCard className="p-4" hover={false}>
          <h3 className="text-white font-medium mb-4">Folder Properties</h3>
          
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
                  <button key={item.type} className={`p-3 rounded-xl ${item.color} hover:scale-105 transition-transform`}>
                    <item.icon size={18} className="mx-auto" />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Include Files</label>
              <div className="space-y-2">
                {['README.md', '.gitkeep', 'index.html'].map(file => (
                  <label key={file} className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-emerald-500" />
                    {file}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4" hover={false}>
          <h3 className="text-white font-medium mb-4">Quick Add</h3>
          <div className="space-y-2">
            {[
              { name: 'Web Project Starter', folders: 12 },
              { name: 'Video Production', folders: 8 },
              { name: 'Documentation', folders: 5 },
            ].map(preset => (
              <button 
                key={preset.name}
                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FolderTree size={16} className="text-zinc-400 group-hover:text-emerald-400" />
                  <span className="text-sm text-zinc-300">{preset.name}</span>
                </div>
                <span className="text-xs text-zinc-500">{preset.folders} folders</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
  
  const renderDevices = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Your Devices</h2>
          <p className="text-zinc-400 text-sm">Manage connected devices and sync settings</p>
        </div>
        <button className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm text-white font-medium flex items-center gap-2">
          <Plus size={16} /> Add Device
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map(device => (
          <DeviceCard
            key={device.id}
            device={device}
            onRemove={(id) => setDevices(devices.filter(d => d.id !== id))}
            onSync={(id) => console.log('Syncing device', id)}
          />
        ))}
      </div>
      
      <GlassCard className="p-6" hover={false}>
        <h3 className="text-white font-medium mb-4">Add New Device</h3>
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/10 rounded-xl">
          <div className="p-4 bg-white/5 rounded-full mb-4">
            <Download size={32} className="text-zinc-400" />
          </div>
          <p className="text-white font-medium mb-2">Download Desktop Agent</p>
          <p className="text-zinc-400 text-sm text-center max-w-sm mb-4">
            Install the FolderForge agent on your computer to enable real-time sync and folder creation.
          </p>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white flex items-center gap-2">
              <Monitor size={16} /> Windows
            </button>
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white flex items-center gap-2">
              <Laptop size={16} /> macOS
            </button>
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white flex items-center gap-2">
              <Monitor size={16} /> Linux
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
  
  const views = {
    dashboard: renderDashboard,
    templates: renderTemplates,
    builder: renderBuilder,
    devices: renderDevices,
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Header */}
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
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center">
                <FolderTree size={20} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white">FolderForge</h1>
                <p className="text-[10px] text-zinc-400 -mt-0.5">Sync Edition</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full">
              <SyncPulse syncing={syncing} />
              <span className="text-xs text-emerald-400">All synced</span>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-lg relative">
              <Bell size={20} className="text-zinc-400" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-sm font-medium">
              S
            </div>
          </div>
        </div>
      </header>
      
      {/* Sidebar - Desktop */}
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
                <span className="text-emerald-400">{templates.length}/{templates.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Devices online</span>
                <span className="text-emerald-400">{devices.filter(d => d.online).length}/{devices.length}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </aside>
      
      {/* Main content */}
      <main className={`pt-20 pb-24 md:pb-8 px-4 md:px-8 transition-all ${sidebarOpen ? 'md:ml-64' : ''}`}>
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <button onClick={() => setActiveView('dashboard')} className="text-zinc-400 hover:text-white">Home</button>
            <ChevronRight size={14} className="text-zinc-600" />
            <span className="text-white capitalize">{activeView}</span>
          </div>
          
          {views[activeView]?.()}
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <MobileNav activeView={activeView} setActiveView={setActiveView} setMobileMenuOpen={setMobileMenuOpen} />
      
      {/* Modals */}
      {shareModalOpen && (
        <ShareModal 
          template={sharingTemplate} 
          onClose={() => setShareModalOpen(false)}
          onShare={(data) => console.log('Sharing:', data)}
        />
      )}
      
      {applyModalOpen && (
        <ApplyModal 
          template={applyingTemplate}
          devices={devices}
          onClose={() => setApplyModalOpen(false)}
          onApply={(templateId, deviceId, path) => {
            console.log('Applying:', { templateId, deviceId, path });
            setApplyModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
