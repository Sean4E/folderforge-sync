# 📁 FolderForge Sync

> The ultimate folder architecture application with real-time synchronization across all your devices.

![FolderForge Sync](https://via.placeholder.com/800x400/18181B/10B981?text=FolderForge+Sync)

## ✨ Features

- **🎨 Visual Template Builder** - Drag-and-drop folder structure creation
- **🔄 Real-time Sync** - Changes sync instantly across all devices
- **💻 Multi-Device** - Connect desktop, laptop, and mobile devices
- **🤝 Two Sharing Modes**:
  - **Copy Mode**: Share a template link, recipient gets their own copy
  - **Collaborate Mode**: Multiple users edit the same template in real-time
- **📱 Mobile Friendly** - Full responsive design with mobile navigation
- **🌙 Beautiful Dark UI** - Glassmorphism design with smooth animations

---

## 🚀 Quick Start

### 1. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Enable the following Auth providers in **Authentication > Providers**:
   - Email (enabled by default)
   - Google (optional)
   - GitHub (optional)

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your Supabase credentials
# Find these at: Project Settings > API
```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 📁 Project Structure

```
folderforge-sync/
├── src/
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client & types
│   │   ├── auth.tsx         # Auth context & hooks
│   │   ├── hooks.ts         # Data hooks with real-time sync
│   │   └── AuthUI.tsx       # Login/Signup components
│   ├── App.tsx              # Main application
│   └── main.tsx             # Entry point
├── supabase/
│   └── schema.sql           # Complete database schema
├── electron/                 # Desktop agent (coming soon)
└── README.md
```

---

## 🗄️ Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `devices` | Registered devices per user |
| `templates` | Folder structure templates |
| `folders` | Individual folders within templates |
| `template_shares` | Share links (Copy Mode) |
| `template_collaborators` | Shared access (Collaborate Mode) |
| `template_applications` | History of folder creations |
| `sync_queue` | Pending sync operations |

### Row Level Security

All tables have RLS policies ensuring:
- Users can only access their own data
- Template access is shared with collaborators
- Public templates are viewable by everyone

---

## 🔌 API Reference

### Authentication

```typescript
import { useAuth } from './lib/auth';

const { user, signIn, signUp, signOut } = useAuth();

// Sign up
await signUp('email@example.com', 'password', 'Display Name');

// Sign in
await signIn('email@example.com', 'password');

// Sign out
await signOut();
```

### Templates

```typescript
import { useTemplates } from './lib/hooks';

const { 
  templates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate,
  cloneTemplate 
} = useTemplates();

// Create a new template
const template = await createTemplate({
  name: 'Web Project',
  color: 'blue',
});

// Clone existing template
const newId = await cloneTemplate(existingTemplateId);
```

### Folders

```typescript
import { useFolders } from './lib/hooks';

const { 
  folderTree, 
  addFolder, 
  updateFolder, 
  deleteFolder,
  moveFolder 
} = useFolders(templateId);

// Add a folder
await addFolder({
  name: 'src',
  parent_id: null, // root level
  folder_type: 'code',
});

// Move folder to new parent
await moveFolder(folderId, newParentId);
```

### Devices

```typescript
import { useDevices } from './lib/hooks';

const { 
  devices, 
  registerDevice, 
  updateDevice, 
  removeDevice 
} = useDevices();

// Register this device
const device = await registerDevice({
  name: 'My Workstation',
  device_type: 'desktop',
  platform: 'windows',
  default_path: 'C:/Projects',
});
```

### Sharing

```typescript
import { useSharing } from './lib/hooks';

const { 
  shares,
  collaborators,
  createShareLink,
  acceptShare,
  inviteCollaborator 
} = useSharing(templateId);

// Create a share link (Copy Mode)
const { link } = await createShareLink(false); // allowUpdates = false

// Accept a share (clone to your account)
const newTemplateId = await acceptShare('abc123');

// Invite collaborator (Collaborate Mode)
await inviteCollaborator('colleague@example.com', 'editor');
```

### Real-time Sync Status

```typescript
import { useSyncStatus } from './lib/hooks';

const { syncing, lastSyncTime, pendingChanges, isFullySynced } = useSyncStatus();
```

---

## 🖥️ Desktop Agent

The desktop agent (Electron) enables:
- Creating folders on your local machine
- Watching for sync queue updates
- Reporting online/offline status
- Background sync operations

### Agent Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│    Supabase     │◀────│  Desktop Agent  │
│  (React App)    │     │   (Real-time)   │     │   (Electron)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   sync_queue    │
                        │   (pending ops) │
                        └─────────────────┘
```

*Desktop agent implementation coming in next phase.*

---

## 🎨 Design System

### Colors

| Name | Value | Usage |
|------|-------|-------|
| Emerald | `#10B981` | Primary actions, success states |
| Cyan | `#06B6D4` | Accents, links |
| Zinc | `#18181B` | Background, cards |
| White/10 | `rgba(255,255,255,0.1)` | Glass effect borders |

### Components

- **GlassCard**: Frosted glass effect container
- **SyncPulse**: Animated sync indicator
- **TreeNode**: Recursive folder tree item
- **DeviceCard**: Device status display

---

## 🔐 Security

- All API calls use Supabase RLS (Row Level Security)
- Device tokens are unique UUIDs for agent authentication
- Share codes are randomly generated 8-character strings
- Collaboration invites expire after 7 days

---

## 📱 Mobile Support

- Responsive breakpoints at `md` (768px) and `lg` (1024px)
- Bottom navigation on mobile
- Touch-friendly tap targets (min 44px)
- Swipe gestures for folder actions (planned)

---

## 🛣️ Roadmap

- [x] Web prototype with full UI
- [x] Supabase schema with RLS
- [x] Authentication flow
- [x] Real-time sync hooks
- [ ] Electron desktop agent
- [ ] Folder drag-and-drop reordering
- [ ] Template import/export (JSON)
- [ ] Template marketplace
- [ ] Keyboard shortcuts
- [ ] Offline mode with conflict resolution

---

## 📄 License

MIT License - Use freely for personal and commercial projects.

---

Built with ❤️ for [4E Virtual Design](https://4e.ie)
