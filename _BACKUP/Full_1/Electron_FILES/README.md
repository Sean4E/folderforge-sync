# 🖥️ FolderForge Sync - Desktop Agent

> Lightweight tray application for real-time folder synchronization

![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Electron](https://img.shields.io/badge/electron-28.x-47848F)

## Overview

The Desktop Agent is a lightweight system tray application that:

- ✅ **Listens for sync operations** from the FolderForge web app
- ✅ **Creates folders** on your local machine in real-time
- ✅ **Reports online status** back to the cloud
- ✅ **Works in background** with minimal resource usage
- ✅ **Starts automatically** on system boot (optional)

---

## 📦 Installation

### From Release (Recommended)

Download the latest release for your platform:

- **Windows**: `FolderForge-Sync-Setup-1.0.0.exe` or `FolderForge-Sync-1.0.0-portable.exe`
- **macOS**: `FolderForge-Sync-1.0.0.dmg`
- **Linux**: `FolderForge-Sync-1.0.0.AppImage` or `.deb`/`.rpm`

### From Source

```bash
# Clone the repository
git clone https://github.com/your-username/folderforge-sync.git
cd folderforge-sync/electron

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for your platform
npm run build
```

---

## 🚀 Quick Setup

### 1. Get Your Credentials

From the FolderForge web app:

1. Go to **Settings** → **API**
2. Copy your **Supabase URL** and **Anon Key**
3. Go to **Devices** → **Add Device**
4. Copy the generated **Device Token**

### 2. Configure the Agent

1. Click the FolderForge icon in your system tray
2. Select **Settings**
3. Enter your credentials:
   - Supabase URL
   - Supabase Anon Key
   - Device Token
4. Click **Test Connection**
5. Click **Save & Connect**

### 3. You're Ready!

The agent will now:
- Show as "Online" in your web dashboard
- Automatically receive and execute folder creation tasks
- Display notifications when folders are created

---

## 🔧 Configuration

### Settings Window

| Setting | Description |
|---------|-------------|
| **Supabase URL** | Your Supabase project URL |
| **Supabase Anon Key** | Public API key for your project |
| **Device Token** | Unique token identifying this device |
| **Default Path** | Where to create folders by default |
| **Launch at Startup** | Start agent when you log in |
| **Show Notifications** | Display system notifications |

### Config File Location

Configuration is stored locally using `electron-store`:

- **Windows**: `%APPDATA%/folderforge-sync-agent/config.json`
- **macOS**: `~/Library/Application Support/folderforge-sync-agent/config.json`
- **Linux**: `~/.config/folderforge-sync-agent/config.json`

---

## 🔄 How Sync Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYNC FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Web App                  Supabase                  Agent       │
│   ───────                  ────────                  ─────       │
│                                                                  │
│   1. User clicks          2. Creates entry         3. Receives  │
│      "Apply Template"        in sync_queue            via        │
│         │                       │                   Realtime     │
│         ▼                       ▼                      │         │
│   ┌──────────┐            ┌──────────┐                 ▼         │
│   │ Template │───────────▶│  Queue   │──────────▶ ┌──────────┐  │
│   │ + Device │            │ (pending)│            │  Process  │  │
│   │ + Path   │            └──────────┘            │  & Create │  │
│   └──────────┘                  │                 │  Folders  │  │
│                                 │                 └──────────┘  │
│                                 ▼                      │         │
│                           ┌──────────┐                 │         │
│                           │ Updated  │◀────────────────┘         │
│                           │(complete)│   4. Updates status       │
│                           └──────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Supported Operations

| Action | Description |
|--------|-------------|
| `apply_template` | Create entire folder structure from template |
| `create_folder` | Create a single folder |
| `delete_folder` | Delete a folder (with contents) |

---

## 🔌 API Reference

### IPC Methods (for extensions)

```javascript
// Get current configuration
const config = await window.folderforge.getConfig();

// Save configuration
await window.folderforge.saveConfig({
  supabaseUrl: '...',
  deviceToken: '...',
});

// Test connection
const result = await window.folderforge.testConnection();
// { success: boolean, error?: string }

// Select folder via dialog
const path = await window.folderforge.selectFolder();

// Disconnect device
await window.folderforge.disconnect();
```

---

## 🏗️ Building

### Prerequisites

- Node.js 18+
- npm or yarn

### Build Commands

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows (NSIS installer + portable)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage, deb, rpm)

# Build for all platforms
npm run build:all
```

### Icon Generation

Before building, generate platform-specific icons from the SVG:

```bash
# Install icon generator
npm install -g electron-icon-maker

# Generate icons
electron-icon-maker --input=assets/icon.svg --output=assets
```

Required icon files:
- `assets/icon.icns` - macOS
- `assets/icon.ico` - Windows
- `assets/icons/` - Linux (multiple sizes)

---

## 🐛 Troubleshooting

### Agent Won't Connect

1. Verify your Supabase URL and Anon Key are correct
2. Check that the Device Token hasn't been revoked
3. Ensure your firewall allows outbound connections

### Folders Not Being Created

1. Check the default path exists and is writable
2. Verify the agent shows as "Online" in the web dashboard
3. Check for error notifications

### Agent Not Starting with System

1. Enable "Launch at Startup" in settings
2. On macOS, grant accessibility permissions if prompted
3. On Linux, check your desktop environment's autostart configuration

### High Resource Usage

The agent should use minimal resources. If you notice high CPU/memory:
1. Check for pending operations in the sync queue
2. Restart the agent
3. Report the issue with logs

---

## 📁 Project Structure

```
electron/
├── main.js           # Main Electron process
├── preload.js        # IPC bridge for renderer
├── settings.html     # Settings UI
├── settings.js       # Settings renderer logic
├── package.json      # Electron dependencies & build config
├── entitlements.mac.plist  # macOS permissions
└── assets/
    ├── icon.svg      # Source icon
    ├── icon.icns     # macOS icon
    ├── icon.ico      # Windows icon
    └── icons/        # Linux icons
```

---

## 📄 License

MIT License - Use freely for personal and commercial projects.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ by [4E Virtual Design](https://4e.ie)
