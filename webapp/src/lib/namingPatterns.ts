// ============================================================================
// FOLDERFORGE SYNC - NAMING PATTERNS SYSTEM
// ============================================================================

export interface NamingPattern {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
  startNumber: number;
  increment: number;
  padLength: number;
  hierarchyMode?: 'flat' | 'nested' | 'dotted';  // How to handle hierarchy
}

// Folder with hierarchy info for pattern application
export interface FolderForPattern {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

export interface NamingPreset {
  id: string;
  name: string;
  description: string;
  category: 'sequential' | 'date' | 'category' | 'custom';
  pattern: NamingPattern;
}

// ============================================================================
// BUILT-IN PRESETS
// ============================================================================

export const NAMING_PRESETS: NamingPreset[] = [
  // Sequential Numbering (Flat - ignores hierarchy)
  {
    id: 'seq-01',
    name: '01_, 02_, 03_',
    description: 'Two-digit prefix (flat)',
    category: 'sequential',
    pattern: {
      id: 'seq-01',
      name: 'Sequential 2-digit',
      prefix: '{nn}_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 2,
      hierarchyMode: 'flat',
    },
  },
  {
    id: 'seq-001',
    name: '001_, 002_, 003_',
    description: 'Three-digit prefix (flat)',
    category: 'sequential',
    pattern: {
      id: 'seq-001',
      name: 'Sequential 3-digit',
      prefix: '{nnn}_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 3,
      hierarchyMode: 'flat',
    },
  },
  // Hierarchy-aware numbering
  {
    id: 'seq-dotted',
    name: '1.1_, 1.2_, 2.1_',
    description: 'Dotted hierarchy (1.1.1)',
    category: 'sequential',
    pattern: {
      id: 'seq-dotted',
      name: 'Dotted Hierarchy',
      prefix: '{hierarchy}_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 1,
      hierarchyMode: 'dotted',
    },
  },
  {
    id: 'seq-nested',
    name: '01_, 01.01_, 01.02_',
    description: 'Padded dotted (01.01.01)',
    category: 'sequential',
    pattern: {
      id: 'seq-nested',
      name: 'Padded Hierarchy',
      prefix: '{hierarchy}_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 2,
      hierarchyMode: 'nested',
    },
  },
  {
    id: 'seq-v1',
    name: '_v1, _v2, _v3',
    description: 'Version number suffix',
    category: 'sequential',
    pattern: {
      id: 'seq-v1',
      name: 'Version suffix',
      prefix: '',
      suffix: '_v{n}',
      startNumber: 1,
      increment: 1,
      padLength: 1,
      hierarchyMode: 'flat',
    },
  },
  {
    id: 'seq-r1',
    name: '_r01, _r02, _r03',
    description: 'Revision number suffix',
    category: 'sequential',
    pattern: {
      id: 'seq-r1',
      name: 'Revision suffix',
      prefix: '',
      suffix: '_r{nn}',
      startNumber: 1,
      increment: 1,
      padLength: 2,
      hierarchyMode: 'flat',
    },
  },

  // Date-based
  {
    id: 'date-ym',
    name: 'YYYY-MM_',
    description: 'Year-month prefix',
    category: 'date',
    pattern: {
      id: 'date-ym',
      name: 'Year-Month',
      prefix: '{YYYY}-{MM}_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 2,
    },
  },
  {
    id: 'date-full',
    name: 'YYYY-MM-DD_',
    description: 'Full date prefix',
    category: 'date',
    pattern: {
      id: 'date-full',
      name: 'Full Date',
      prefix: '{YYYY}-{MM}-{DD}_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 2,
    },
  },
  {
    id: 'date-compact',
    name: 'YYYYMMDD_',
    description: 'Compact date prefix',
    category: 'date',
    pattern: {
      id: 'date-compact',
      name: 'Compact Date',
      prefix: '{YYYY}{MM}{DD}_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 2,
    },
  },

  // Category Tags
  {
    id: 'cat-wip',
    name: 'WIP_',
    description: 'Work in progress prefix',
    category: 'category',
    pattern: {
      id: 'cat-wip',
      name: 'WIP',
      prefix: 'WIP_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 2,
    },
  },
  {
    id: 'cat-final',
    name: 'FINAL_',
    description: 'Final version prefix',
    category: 'category',
    pattern: {
      id: 'cat-final',
      name: 'Final',
      prefix: 'FINAL_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 2,
    },
  },
  {
    id: 'cat-draft',
    name: 'DRAFT_',
    description: 'Draft status prefix',
    category: 'category',
    pattern: {
      id: 'cat-draft',
      name: 'Draft',
      prefix: 'DRAFT_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 2,
    },
  },
  {
    id: 'cat-archive',
    name: 'ARCHIVE_',
    description: 'Archive status prefix',
    category: 'category',
    pattern: {
      id: 'cat-archive',
      name: 'Archive',
      prefix: 'ARCHIVE_',
      suffix: '',
      startNumber: 1,
      increment: 1,
      padLength: 2,
    },
  },
  {
    id: 'cat-old',
    name: '_OLD',
    description: 'Old version suffix',
    category: 'category',
    pattern: {
      id: 'cat-old',
      name: 'Old',
      prefix: '',
      suffix: '_OLD',
      startNumber: 1,
      increment: 1,
      padLength: 2,
    },
  },
  {
    id: 'cat-backup',
    name: '_BACKUP',
    description: 'Backup suffix',
    category: 'category',
    pattern: {
      id: 'cat-backup',
      name: 'Backup',
      prefix: '',
      suffix: '_BACKUP',
      startNumber: 1,
      increment: 1,
      padLength: 2,
    },
  },
];

// ============================================================================
// PATTERN APPLICATION FUNCTIONS
// ============================================================================

/**
 * Build hierarchy index for a folder (e.g., "1.2.3" for nested, "01.02.03" for padded)
 */
export function buildHierarchyIndex(
  folderId: string,
  folders: FolderForPattern[],
  padLength: number = 1
): string {
  const parts: number[] = [];
  let currentId: string | null = folderId;

  // Build path from folder to root
  while (currentId) {
    const folder = folders.find(f => f.id === currentId);
    if (!folder) break;

    // Get siblings at this level
    const siblings = folders
      .filter(f => f.parent_id === folder.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);

    // Find this folder's index among siblings (1-based)
    const siblingIndex = siblings.findIndex(s => s.id === currentId) + 1;
    parts.unshift(siblingIndex);

    currentId = folder.parent_id;
  }

  // Format based on pad length
  return parts.map(n => String(n).padStart(padLength, '0')).join('.');
}

/**
 * Get flat index for a folder within its siblings only
 */
export function getSiblingIndex(
  folderId: string,
  folders: FolderForPattern[]
): number {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return 0;

  const siblings = folders
    .filter(f => f.parent_id === folder.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return siblings.findIndex(s => s.id === folderId);
}

/**
 * Apply a naming pattern to a base name (simple flat indexing)
 */
export function applyNamingPattern(
  baseName: string,
  pattern: NamingPattern,
  index: number
): string {
  const number = pattern.startNumber + (index * pattern.increment);

  const now = new Date();

  const replaceTokens = (str: string): string => {
    return str
      .replace(/{n}/g, String(number))
      .replace(/{nn}/g, String(number).padStart(2, '0'))
      .replace(/{nnn}/g, String(number).padStart(3, '0'))
      .replace(/{nnnn}/g, String(number).padStart(4, '0'))
      .replace(/{hierarchy}/g, String(number).padStart(pattern.padLength, '0')) // Fallback for flat
      .replace(/{YYYY}/g, String(now.getFullYear()))
      .replace(/{YY}/g, String(now.getFullYear()).slice(-2))
      .replace(/{MM}/g, String(now.getMonth() + 1).padStart(2, '0'))
      .replace(/{DD}/g, String(now.getDate()).padStart(2, '0'))
      .replace(/{HH}/g, String(now.getHours()).padStart(2, '0'))
      .replace(/{mm}/g, String(now.getMinutes()).padStart(2, '0'));
  };

  const prefix = replaceTokens(pattern.prefix);
  const suffix = replaceTokens(pattern.suffix);

  return `${prefix}${baseName}${suffix}`;
}

/**
 * Apply a naming pattern with hierarchy awareness
 */
export function applyNamingPatternWithHierarchy(
  baseName: string,
  pattern: NamingPattern,
  folderId: string,
  allFolders: FolderForPattern[]
): string {
  const now = new Date();

  // Build hierarchy index for this folder
  const hierarchyIndex = buildHierarchyIndex(folderId, allFolders, pattern.padLength);
  const siblingIndex = getSiblingIndex(folderId, allFolders);
  const number = pattern.startNumber + (siblingIndex * pattern.increment);

  const replaceTokens = (str: string): string => {
    return str
      .replace(/{n}/g, String(number))
      .replace(/{nn}/g, String(number).padStart(2, '0'))
      .replace(/{nnn}/g, String(number).padStart(3, '0'))
      .replace(/{nnnn}/g, String(number).padStart(4, '0'))
      .replace(/{hierarchy}/g, hierarchyIndex)
      .replace(/{YYYY}/g, String(now.getFullYear()))
      .replace(/{YY}/g, String(now.getFullYear()).slice(-2))
      .replace(/{MM}/g, String(now.getMonth() + 1).padStart(2, '0'))
      .replace(/{DD}/g, String(now.getDate()).padStart(2, '0'))
      .replace(/{HH}/g, String(now.getHours()).padStart(2, '0'))
      .replace(/{mm}/g, String(now.getMinutes()).padStart(2, '0'));
  };

  const prefix = replaceTokens(pattern.prefix);
  const suffix = replaceTokens(pattern.suffix);

  return `${prefix}${baseName}${suffix}`;
}

/**
 * Generate preview of names with pattern applied (for simple list)
 */
export function generatePatternPreview(
  baseNames: string[],
  pattern: NamingPattern
): string[] {
  return baseNames.map((name, index) => applyNamingPattern(name, pattern, index));
}

/**
 * Generate preview of names with hierarchy-aware pattern
 */
export function generateHierarchyPatternPreview(
  folders: FolderForPattern[],
  pattern: NamingPattern
): Array<{ id: string; originalName: string; newName: string }> {
  return folders.map(folder => ({
    id: folder.id,
    originalName: folder.name,
    newName: applyNamingPatternWithHierarchy(folder.name, pattern, folder.id, folders),
  }));
}

/**
 * Create a default custom pattern
 */
export function createDefaultPattern(): NamingPattern {
  return {
    id: 'custom',
    name: 'Custom Pattern',
    prefix: '',
    suffix: '',
    startNumber: 1,
    increment: 1,
    padLength: 2,
  };
}

/**
 * Available tokens for custom patterns
 */
export const AVAILABLE_TOKENS = [
  { token: '{hierarchy}', description: 'Hierarchy path (1.2.3)' },
  { token: '{n}', description: 'Number (1, 2, 3...)' },
  { token: '{nn}', description: 'Padded 2-digit (01, 02...)' },
  { token: '{nnn}', description: 'Padded 3-digit (001, 002...)' },
  { token: '{YYYY}', description: 'Full year (2024)' },
  { token: '{YY}', description: 'Short year (24)' },
  { token: '{MM}', description: 'Month (01-12)' },
  { token: '{DD}', description: 'Day (01-31)' },
  { token: '{HH}', description: 'Hour (00-23)' },
  { token: '{mm}', description: 'Minute (00-59)' },
];

// ============================================================================
// PATTERN DETECTION AND MANAGEMENT
// ============================================================================

export interface DetectedPattern {
  type: string;
  description: string;
  separator?: string;
  padLength?: number;
  prefix?: string;
  count: number;
  confidence: number;
}

/**
 * Result of analyzing a folder's existing prefix/suffix
 */
export interface ParsedFolderName {
  prefix: string;
  baseName: string;
  suffix: string;
  prefixType: 'numeric' | 'hierarchy' | 'date' | 'category' | 'none';
  suffixType: 'version' | 'revision' | 'category' | 'none';
  prefixNumber?: number;
  prefixHierarchy?: string;
  suffixNumber?: number;
  padLength?: number;
  separator?: string;
}

/**
 * Parse a folder name to extract prefix, base name, and suffix
 */
export function parseFolderName(name: string): ParsedFolderName {
  let prefix = '';
  let baseName = name;
  let suffix = '';
  let prefixType: ParsedFolderName['prefixType'] = 'none';
  let suffixType: ParsedFolderName['suffixType'] = 'none';
  let prefixNumber: number | undefined;
  let prefixHierarchy: string | undefined;
  let suffixNumber: number | undefined;
  let padLength: number | undefined;
  let separator: string | undefined;

  // Check for hierarchy prefix (1.2.3_ or 01.02.03_)
  const hierarchyMatch = name.match(/^((\d+\.)+\d+)([_\-\s])/);
  if (hierarchyMatch) {
    prefix = hierarchyMatch[1] + hierarchyMatch[3];
    baseName = name.slice(prefix.length);
    prefixType = 'hierarchy';
    prefixHierarchy = hierarchyMatch[1];
    separator = hierarchyMatch[3];
    const parts = hierarchyMatch[1].split('.');
    padLength = parts[0].length;
  }

  // Check for numeric prefix (01_, 001_, etc.)
  if (prefixType === 'none') {
    const numericMatch = name.match(/^(\d+)([_\-\s])/);
    if (numericMatch) {
      prefix = numericMatch[1] + numericMatch[2];
      baseName = name.slice(prefix.length);
      prefixType = 'numeric';
      prefixNumber = parseInt(numericMatch[1], 10);
      padLength = numericMatch[1].length;
      separator = numericMatch[2];
    }
  }

  // Check for date prefix (YYYY-MM-DD_, YYYY-MM_, YYYYMMDD_)
  if (prefixType === 'none') {
    const fullDateMatch = name.match(/^(\d{4}-\d{2}-\d{2})([_\-\s])/);
    const yearMonthMatch = name.match(/^(\d{4}-\d{2})([_\-\s])/);
    const compactDateMatch = name.match(/^(\d{8})([_\-\s])/);

    if (fullDateMatch) {
      prefix = fullDateMatch[1] + fullDateMatch[2];
      baseName = name.slice(prefix.length);
      prefixType = 'date';
      separator = fullDateMatch[2];
    } else if (yearMonthMatch) {
      prefix = yearMonthMatch[1] + yearMonthMatch[2];
      baseName = name.slice(prefix.length);
      prefixType = 'date';
      separator = yearMonthMatch[2];
    } else if (compactDateMatch) {
      prefix = compactDateMatch[1] + compactDateMatch[2];
      baseName = name.slice(prefix.length);
      prefixType = 'date';
      separator = compactDateMatch[2];
    }
  }

  // Check for category prefix (WIP_, FINAL_, etc.)
  if (prefixType === 'none') {
    const categoryPrefixes = ['WIP', 'FINAL', 'DRAFT', 'ARCHIVE', 'OLD', 'NEW', 'TEMP', 'TEST', 'DEV', 'PROD'];
    for (const cat of categoryPrefixes) {
      const regex = new RegExp(`^(${cat})([_\\-\\s])`, 'i');
      const match = name.match(regex);
      if (match) {
        prefix = match[1] + match[2];
        baseName = name.slice(prefix.length);
        prefixType = 'category';
        separator = match[2];
        break;
      }
    }
  }

  // Check for version suffix (_v1, _v2)
  const versionMatch = baseName.match(/([_\-]v)(\d+)$/i);
  if (versionMatch) {
    suffix = versionMatch[1] + versionMatch[2];
    baseName = baseName.slice(0, -suffix.length);
    suffixType = 'version';
    suffixNumber = parseInt(versionMatch[2], 10);
  }

  // Check for revision suffix (_r01, _r02)
  if (suffixType === 'none') {
    const revisionMatch = baseName.match(/([_\-]r)(\d+)$/i);
    if (revisionMatch) {
      suffix = revisionMatch[1] + revisionMatch[2];
      baseName = baseName.slice(0, -suffix.length);
      suffixType = 'revision';
      suffixNumber = parseInt(revisionMatch[2], 10);
      padLength = revisionMatch[2].length;
    }
  }

  // Check for category suffix (_OLD, _BACKUP)
  if (suffixType === 'none') {
    const categorySuffixes = ['OLD', 'BACKUP', 'ARCHIVE', 'COPY', 'NEW'];
    for (const cat of categorySuffixes) {
      const regex = new RegExp(`([_\\-])(${cat})$`, 'i');
      const match = baseName.match(regex);
      if (match) {
        suffix = match[1] + match[2];
        baseName = baseName.slice(0, -suffix.length);
        suffixType = 'category';
        break;
      }
    }
  }

  return {
    prefix,
    baseName,
    suffix,
    prefixType,
    suffixType,
    prefixNumber,
    prefixHierarchy,
    suffixNumber,
    padLength,
    separator,
  };
}

/**
 * Detect the naming pattern used by siblings at a given level
 */
export function detectSiblingPattern(siblings: FolderForPattern[]): {
  hasPattern: boolean;
  patternType: 'numeric' | 'hierarchy' | 'date' | 'category' | 'none';
  separator: string;
  padLength: number;
  nextNumber: number;
  confidence: number;
} {
  if (siblings.length === 0) {
    return {
      hasPattern: false,
      patternType: 'none',
      separator: '_',
      padLength: 2,
      nextNumber: 1,
      confidence: 0,
    };
  }

  // Parse all sibling names
  const parsed = siblings.map(s => parseFolderName(s.name));

  // Count pattern types
  const numericCount = parsed.filter(p => p.prefixType === 'numeric').length;
  const hierarchyCount = parsed.filter(p => p.prefixType === 'hierarchy').length;
  const dateCount = parsed.filter(p => p.prefixType === 'date').length;
  const categoryCount = parsed.filter(p => p.prefixType === 'category').length;

  const total = siblings.length;
  const maxCount = Math.max(numericCount, hierarchyCount, dateCount, categoryCount);

  if (maxCount === 0 || maxCount / total < 0.5) {
    return {
      hasPattern: false,
      patternType: 'none',
      separator: '_',
      padLength: 2,
      nextNumber: 1,
      confidence: 0,
    };
  }

  // Determine dominant pattern type
  let patternType: 'numeric' | 'hierarchy' | 'date' | 'category' | 'none' = 'none';
  if (numericCount === maxCount) patternType = 'numeric';
  else if (hierarchyCount === maxCount) patternType = 'hierarchy';
  else if (dateCount === maxCount) patternType = 'date';
  else if (categoryCount === maxCount) patternType = 'category';

  // Find the most common separator and pad length from matching patterns
  const matchingParsed = parsed.filter(p => p.prefixType === patternType);
  const separators = matchingParsed.map(p => p.separator || '_');
  const padLengths = matchingParsed.map(p => p.padLength || 2);

  const separator = separators.sort((a, b) =>
    separators.filter(s => s === b).length - separators.filter(s => s === a).length
  )[0] || '_';

  const padLength = padLengths.sort((a, b) =>
    padLengths.filter(p => p === b).length - padLengths.filter(p => p === a).length
  )[0] || 2;

  // Calculate next number based on existing numbers
  let nextNumber = 1;
  if (patternType === 'numeric') {
    const numbers = matchingParsed
      .filter(p => p.prefixNumber !== undefined)
      .map(p => p.prefixNumber!);
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1;
    }
  }

  return {
    hasPattern: true,
    patternType,
    separator,
    padLength,
    nextNumber,
    confidence: maxCount / total,
  };
}

/**
 * Generate the next folder name following the sibling pattern
 */
export function generateNextFolderName(
  baseName: string,
  siblings: FolderForPattern[],
  parentHierarchy?: string
): string {
  const pattern = detectSiblingPattern(siblings);

  if (!pattern.hasPattern) {
    return baseName;
  }

  switch (pattern.patternType) {
    case 'numeric': {
      const paddedNumber = String(pattern.nextNumber).padStart(pattern.padLength, '0');
      return `${paddedNumber}${pattern.separator}${baseName}`;
    }
    case 'hierarchy': {
      // For hierarchy, append the next sibling number to parent hierarchy
      const siblingIndex = siblings.length + 1;
      const paddedIndex = String(siblingIndex).padStart(pattern.padLength, '0');
      const hierarchy = parentHierarchy
        ? `${parentHierarchy}.${paddedIndex}`
        : paddedIndex;
      return `${hierarchy}${pattern.separator}${baseName}`;
    }
    case 'date': {
      // Use current date
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return `${dateStr}${pattern.separator}${baseName}`;
    }
    case 'category':
      // Don't auto-apply category prefixes
      return baseName;
    default:
      return baseName;
  }
}

/**
 * Renumber all folders based on their actual position in the tree
 * Returns updates needed to apply the new numbering
 */
export function renumberFoldersByPosition(
  folders: FolderForPattern[],
  options: {
    mode: 'numeric' | 'hierarchy';
    padLength: number;
    separator: string;
  } = { mode: 'numeric', padLength: 2, separator: '_' }
): Array<{ id: string; oldName: string; newName: string }> {
  const updates: Array<{ id: string; oldName: string; newName: string }> = [];

  // Build tree structure for traversal
  const childrenMap = new Map<string | null, FolderForPattern[]>();
  folders.forEach(f => {
    const parentId = f.parent_id;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(f);
  });

  // Sort children by sort_order
  childrenMap.forEach(children => {
    children.sort((a, b) => a.sort_order - b.sort_order);
  });

  // Recursive function to process folders
  const processLevel = (parentId: string | null, parentHierarchy: string) => {
    const children = childrenMap.get(parentId) || [];

    children.forEach((folder, index) => {
      const parsed = parseFolderName(folder.name);
      const positionNum = index + 1;
      const paddedNum = String(positionNum).padStart(options.padLength, '0');

      let newPrefix: string;
      if (options.mode === 'hierarchy' && parentHierarchy) {
        newPrefix = `${parentHierarchy}.${paddedNum}${options.separator}`;
      } else if (options.mode === 'hierarchy') {
        newPrefix = `${paddedNum}${options.separator}`;
      } else {
        newPrefix = `${paddedNum}${options.separator}`;
      }

      const newName = `${newPrefix}${parsed.baseName}${parsed.suffix}`;

      if (newName !== folder.name) {
        updates.push({
          id: folder.id,
          oldName: folder.name,
          newName,
        });
      }

      // Process children with updated hierarchy
      const childHierarchy = options.mode === 'hierarchy'
        ? (parentHierarchy ? `${parentHierarchy}.${paddedNum}` : paddedNum)
        : '';
      processLevel(folder.id, childHierarchy);
    });
  };

  processLevel(null, '');
  return updates;
}

/**
 * Remove prefix and/or suffix from a folder name
 */
export function stripPrefixSuffix(
  name: string,
  options: { stripPrefix?: boolean; stripSuffix?: boolean } = { stripPrefix: true, stripSuffix: true }
): string {
  const parsed = parseFolderName(name);

  let result = parsed.baseName;

  if (!options.stripPrefix && parsed.prefix) {
    result = parsed.prefix + result;
  }

  if (!options.stripSuffix && parsed.suffix) {
    result = result + parsed.suffix;
  }

  return result;
}

/**
 * Apply new prefix/suffix to a name (replacing any existing)
 */
export function replacePrefixSuffix(
  name: string,
  newPrefix: string,
  newSuffix: string
): string {
  const parsed = parseFolderName(name);
  return `${newPrefix}${parsed.baseName}${newSuffix}`;
}

/**
 * Get tree-level pattern information for display
 */
export interface TreePatternInfo {
  hasPattern: boolean;
  patternType: 'numeric' | 'hierarchy' | 'date' | 'category' | 'mixed' | 'none';
  patternDescription: string;
  affectedCount: number;
  totalCount: number;
}

export function analyzeTreePattern(folders: FolderForPattern[]): TreePatternInfo {
  if (folders.length === 0) {
    return {
      hasPattern: false,
      patternType: 'none',
      patternDescription: 'No folders',
      affectedCount: 0,
      totalCount: 0,
    };
  }

  const parsed = folders.map(f => parseFolderName(f.name));
  const counts = {
    numeric: parsed.filter(p => p.prefixType === 'numeric').length,
    hierarchy: parsed.filter(p => p.prefixType === 'hierarchy').length,
    date: parsed.filter(p => p.prefixType === 'date').length,
    category: parsed.filter(p => p.prefixType === 'category').length,
    none: parsed.filter(p => p.prefixType === 'none').length,
  };

  const total = folders.length;
  const withPattern = total - counts.none;

  if (withPattern === 0) {
    return {
      hasPattern: false,
      patternType: 'none',
      patternDescription: 'No naming pattern detected',
      affectedCount: 0,
      totalCount: total,
    };
  }

  // Check if multiple pattern types are present
  const activeTypes = Object.entries(counts)
    .filter(([key, count]) => key !== 'none' && count > 0);

  if (activeTypes.length > 1) {
    return {
      hasPattern: true,
      patternType: 'mixed',
      patternDescription: 'Mixed patterns detected',
      affectedCount: withPattern,
      totalCount: total,
    };
  }

  const dominantType = activeTypes[0][0] as 'numeric' | 'hierarchy' | 'date' | 'category';
  const descriptions: Record<string, string> = {
    numeric: 'Numeric prefix (01_, 02_...)',
    hierarchy: 'Hierarchy prefix (1.1_, 1.2_...)',
    date: 'Date prefix (YYYY-MM-DD_)',
    category: 'Category prefix (WIP_, FINAL_...)',
  };

  return {
    hasPattern: true,
    patternType: dominantType,
    patternDescription: descriptions[dominantType],
    affectedCount: withPattern,
    totalCount: total,
  };
}

/**
 * Detect naming patterns from a list of folder names
 */
export function detectNamingPatterns(names: string[]): DetectedPattern[] {
  if (names.length < 2) return [];

  const patterns: DetectedPattern[] = [];

  // Detect numeric prefix patterns (01_, 02_, etc.)
  const numericPrefixPattern = /^(\d+)([_\-\s])/;
  const prefixMatches = names.filter(n => numericPrefixPattern.test(n));
  if (prefixMatches.length >= 2) {
    const match = names[0].match(numericPrefixPattern);
    if (match) {
      patterns.push({
        type: 'numeric_prefix',
        description: `Sequential numbering prefix (${match[1]}${match[2]})`,
        separator: match[2],
        padLength: match[1].length,
        count: prefixMatches.length,
        confidence: prefixMatches.length / names.length,
      });
    }
  }

  // Detect date prefix patterns
  const datePatterns = [
    { regex: /^(\d{4})-(\d{2})-(\d{2})[_\-\s]/, type: 'full_date', desc: 'Full date prefix (YYYY-MM-DD)' },
    { regex: /^(\d{4})-(\d{2})[_\-\s]/, type: 'year_month', desc: 'Year-month prefix (YYYY-MM)' },
    { regex: /^(\d{8})[_\-\s]/, type: 'compact_date', desc: 'Compact date prefix (YYYYMMDD)' },
    { regex: /^(\d{4})[_\-\s]/, type: 'year', desc: 'Year prefix (YYYY)' },
  ];

  for (const dp of datePatterns) {
    const matches = names.filter(n => dp.regex.test(n));
    if (matches.length >= 2) {
      patterns.push({
        type: dp.type,
        description: dp.desc,
        count: matches.length,
        confidence: matches.length / names.length,
      });
      break; // Only report most specific date pattern
    }
  }

  // Detect category prefixes
  const categoryPrefixes = ['WIP', 'FINAL', 'DRAFT', 'ARCHIVE', 'OLD', 'NEW', 'TEMP', 'TEST', 'DEV', 'PROD'];
  for (const prefix of categoryPrefixes) {
    const regex = new RegExp(`^${prefix}[_\\-\\s]`, 'i');
    const matches = names.filter(n => regex.test(n));
    if (matches.length >= 2) {
      patterns.push({
        type: 'category_prefix',
        description: `Category prefix (${prefix}_)`,
        prefix,
        count: matches.length,
        confidence: matches.length / names.length,
      });
    }
  }

  // Detect version suffix patterns (_v1, _v2)
  const versionSuffixPattern = /[_\-]v(\d+)$/i;
  const versionMatches = names.filter(n => versionSuffixPattern.test(n));
  if (versionMatches.length >= 2) {
    patterns.push({
      type: 'version_suffix',
      description: 'Version number suffix (_v1, _v2)',
      count: versionMatches.length,
      confidence: versionMatches.length / names.length,
    });
  }

  // Detect revision suffix patterns (_r01, _r02)
  const revisionSuffixPattern = /[_\-]r(\d+)$/i;
  const revisionMatches = names.filter(n => revisionSuffixPattern.test(n));
  if (revisionMatches.length >= 2) {
    patterns.push({
      type: 'revision_suffix',
      description: 'Revision number suffix (_r01, _r02)',
      count: revisionMatches.length,
      confidence: revisionMatches.length / names.length,
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}
