// ============================================================================
// FOLDERFORGE SYNC - DROP CONTEXT MENU
// ============================================================================

import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, FolderPlus } from 'lucide-react';

export type DropPosition = 'child' | 'above' | 'below';

interface DropContextMenuProps {
  position: { x: number; y: number };
  targetName: string;
  onSelect: (position: DropPosition) => void;
  onClose: () => void;
}

export const DropContextMenu: React.FC<DropContextMenuProps> = ({
  position,
  targetName,
  onSelect,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
      }
    }
  }, [position]);

  // Truncate long folder names
  const displayName = targetName.length > 20
    ? targetName.substring(0, 20) + '...'
    : targetName;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-zinc-800/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl py-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-150"
        style={{ left: position.x, top: position.y }}
      >
        <div className="px-3 py-1.5 text-xs text-zinc-500 uppercase tracking-wider border-b border-white/5 mb-1">
          Move to...
        </div>

        <button
          onClick={() => onSelect('child')}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-500/20 text-left transition-colors group"
        >
          <div className="p-1.5 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30">
            <FolderPlus size={14} className="text-emerald-400" />
          </div>
          <div>
            <span className="text-sm text-white block">Insert as child</span>
            <span className="text-xs text-zinc-500">Inside "{displayName}"</span>
          </div>
        </button>

        <button
          onClick={() => onSelect('above')}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-500/20 text-left transition-colors group"
        >
          <div className="p-1.5 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30">
            <ArrowUp size={14} className="text-blue-400" />
          </div>
          <div>
            <span className="text-sm text-white block">Insert above</span>
            <span className="text-xs text-zinc-500">Before "{displayName}"</span>
          </div>
        </button>

        <button
          onClick={() => onSelect('below')}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-500/20 text-left transition-colors group"
        >
          <div className="p-1.5 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30">
            <ArrowDown size={14} className="text-amber-400" />
          </div>
          <div>
            <span className="text-sm text-white block">Insert below</span>
            <span className="text-xs text-zinc-500">After "{displayName}"</span>
          </div>
        </button>

        <div className="border-t border-white/5 mt-1 pt-1">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-xs text-zinc-500 hover:text-zinc-400 text-left transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
};

export default DropContextMenu;
