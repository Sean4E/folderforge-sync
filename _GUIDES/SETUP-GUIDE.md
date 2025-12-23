# FolderForge Sync - Complete Setup Guide

A step-by-step guide to set up the entire FolderForge Sync system from scratch.

---

## Table of Contents

1. [Prerequisites](#step-1-prerequisites)
2. [Create Supabase Project](#step-2-create-supabase-project)
3. [Set Up Database](#step-3-set-up-database)
4. [Configure Authentication](#step-4-configure-authentication)
5. [Set Up Web Application](#step-5-set-up-web-application)
6. [Set Up Electron Desktop Agent](#step-6-set-up-electron-desktop-agent)
7. [Connect Everything](#step-7-connect-everything)
8. [Test the Full Flow](#step-8-test-the-full-flow)
9. [Build for Production](#step-9-build-for-production)

---

## Step 1: Prerequisites

### Install Required Software

```bash
# Check Node.js (need v18 or higher)
node --version

# If not installed, download from https://nodejs.org
# Or use nvm:
nvm install 18
nvm use 18

# Check npm
npm --version
```

### Create Project Folder

```bash
# Create and enter project directory
mkdir folderforge-sync
cd folderforge-sync
```

### Download Project Files

Copy all the files I provided into your project folder with this structure:

```
folderforge-sync/
├── src/
│   └── lib/
│       ├── supabase.ts
│       ├── auth.tsx
│       ├── hooks.ts
│       ├── AuthUI.tsx
│       └── AddDeviceModal.tsx
├── supabase/
│   └── schema.sql
├── electron/
│   ├── main.js
│   ├── preload.js
│   ├── settings.html
│   ├── settings.js
│   ├── package.json
│   ├── generate-icons.js
│   └── assets/
│       └── icon.svg
├── package.json
├── .env.example
└── README.md
```

---

## Step 2: Create Supabase Project

### 2.1 Create Account & Project

1. Go to **[supabase.com](https://supabase.com)**
2. Click **"Start your project"** (sign up with GitHub recommended)
3. Click **"New Project"**
4. Fill in:
   - **Name**: `folderforge-sync`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to you
5. Click **"Create new project"**
6. Wait 2-3 minutes for project to provision

### 2.2 Get Your API Credentials

1. In your Supabase dashboard, go to **Project Settings** (gear icon)
2. Click **API** in the left sidebar
3. Copy these values (you'll need them later):

```
Project URL:     https://xxxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 3: Set Up Database

### 3.1 Run the Schema

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open `supabase/schema.sql` from your project
4. Copy the ENTIRE contents
5. Paste into the SQL Editor
6. Click **"Run"** (or Cmd/Ctrl + Enter)

You should see: `Success. No rows returned`

### 3.2 Verify Tables Created

1. Click **Table Editor** (left sidebar)
2. You should see these tables:
   - ✅ profiles
   - ✅ devices
   - ✅ templates
   - ✅ folders
   - ✅ template_shares
   - ✅ template_collaborators
   - ✅ collaboration_invites
   - ✅ template_applications
   - ✅ sync_queue

### 3.3 Enable Realtime

1. Go to **Database** → **Replication**
2. Under "Supabase Realtime", click **"0 tables"**
3. Enable these tables by toggling them ON:
   - ✅ templates
   - ✅ folders
   - ✅ devices
   - ✅ template_collaborators
   - ✅ sync_queue
4. Click **"Save"**

---

## Step 4: Configure Authentication

### 4.1 Enable Email Auth (Default)

1. Go to **Authentication** → **Providers**
2. **Email** should already be enabled
3. Configure settings:
   - ✅ Enable Email Signup
   - ✅ Confirm Email (recommended for production, disable for testing)

### 4.2 (Optional) Enable Google Auth

1. Go to **Authentication** → **Providers** → **Google**
2. Toggle **Enable**
3. Go to [Google Cloud Console](https://console.cloud.google.com)
4. Create OAuth credentials:
   - Create new project or select existing
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client Secret** back to Supabase
6. Click **Save**

### 4.3 (Optional) Enable GitHub Auth

1. Go to **Authentication** → **Providers** → **GitHub**
2. Toggle **Enable**
3. Go to [GitHub Developer Settings](https://github.com/settings/developers)
4. Click **New OAuth App**:
   - Application name: `FolderForge Sync`
   - Homepage URL: `http://localhost:5173` (or your domain)
   - Callback URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client Secret** back to Supabase
6. Click **Save**

---

## Step 5: Set Up Web Application

### 5.1 Create Environment File

```bash
# In your project root
cp .env.example .env
```

### 5.2 Edit .env File

Open `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL=http://localhost:5173
```

### 5.3 Install Dependencies

```bash
# In project root
npm install
```

### 5.4 Create Required Config Files

**Create `vite.config.ts`:**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**Create `tailwind.config.js`:**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Create `postcss.config.js`:**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Create `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Create `tsconfig.node.json`:**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### 5.5 Create Entry Files

**Create `index.html`:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FolderForge Sync</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Create `src/main.tsx`:**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Create `src/index.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Create `src/App.tsx`:**

```tsx
import { AuthProvider, useAuth, ProtectedRoute } from './lib/auth'
import { AuthPage } from './lib/AuthUI'
// Import your main app component (the prototype)
// For now, a simple placeholder:

function Dashboard() {
  const { profile, signOut } = useAuth()
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome, {profile?.display_name}!</h1>
      <button 
        onClick={signOut}
        className="px-4 py-2 bg-red-500 rounded-lg"
      >
        Sign Out
      </button>
      {/* Import and render the full FolderForgeSync component here */}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute fallback={<AuthPage />}>
        <Dashboard />
      </ProtectedRoute>
    </AuthProvider>
  )
}

export default App
```

### 5.6 Run the Web App

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

### 5.7 Test Authentication

1. You should see the login page
2. Click **"Sign Up"**
3. Enter email and password
4. Check your email for confirmation (if enabled)
5. Sign in
6. You should see the dashboard

---

## Step 6: Set Up Electron Desktop Agent

### 6.1 Install Dependencies

```bash
cd electron
npm install
```

### 6.2 Generate Tray Icons

```bash
node generate-icons.js
```

### 6.3 Run in Development Mode

```bash
npm run dev
```

The app will start in the system tray.

---

## Step 7: Connect Everything

### 7.1 Register a Device (Web App)

1. In the web app, go to **Devices**
2. Click **"Add Device"**
3. Enter a device name (e.g., "My Workstation")
4. Select device type and platform
5. Click **"Generate Token"**
6. Copy the three values shown:
   - Supabase URL
   - Supabase Anon Key
   - Device Token

### 7.2 Configure Desktop Agent

1. Click the FolderForge icon in your system tray
2. Select **"Settings"**
3. Paste the values:
   - **Supabase URL**: `https://xxx.supabase.co`
   - **Supabase Anon Key**: `eyJhbGci...`
   - **Device Token**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
4. Click **"Test Connection"**
5. Should show: ✅ "Connection successful!"
6. Click **"Save & Connect"**

### 7.3 Verify Connection

1. Check the tray menu - should show **"● Connected"**
2. In the web app, go to **Devices**
3. Your device should show as **"Online"** with a green dot

---

## Step 8: Test the Full Flow

### 8.1 Create a Template

1. In the web app, go to **Template Builder**
2. Enter a template name: "Test Project"
3. Add some folders:
   - Click **"Add Folder"** → Name it "src"
   - Select "src" → Click **"Add Subfolder"** → Name it "components"
   - Add more as desired

### 8.2 Apply Template to Device

1. Go to **Templates**
2. Find your template
3. Click **"Apply"**
4. Select your connected device
5. Enter a target path: `C:\Projects\test` (Windows) or `/Users/you/Projects/test` (Mac)
6. Click **"Create Folders"**

### 8.3 Verify Folders Created

1. Check the desktop agent - you should get a notification
2. Open the target path on your computer
3. ✅ The folder structure should be created!

---

## Step 9: Build for Production

### 9.1 Build Web App

```bash
# In project root
npm run build
```

Output will be in `dist/` folder.

Deploy to:
- **Vercel**: `npx vercel`
- **Netlify**: Drag & drop `dist` folder
- **Any static host**: Upload `dist` folder

### 9.2 Build Desktop Agent

```bash
cd electron

# For your current platform
npm run build

# For specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux

# For all platforms (requires all SDKs)
npm run build:all
```

Output will be in `electron/dist/` folder.

### 9.3 Update Download Links

Edit `src/lib/AddDeviceModal.tsx` to point to your actual release URLs:

```typescript
const DOWNLOAD_LINKS = {
  windows: {
    name: 'Windows',
    installer: 'https://your-domain.com/downloads/FolderForge-Sync-Setup.exe',
  },
  // ... etc
};
```

---

## Troubleshooting

### Web App Issues

| Problem | Solution |
|---------|----------|
| "Supabase credentials not found" | Check `.env` file has correct values |
| Auth not working | Verify Supabase Auth providers are enabled |
| Real-time not updating | Check Replication is enabled for tables |

### Desktop Agent Issues

| Problem | Solution |
|---------|----------|
| "Connection failed" | Verify all three credentials are correct |
| Device shows offline | Check firewall allows outbound connections |
| Folders not created | Verify target path exists and is writable |
| Tray icon not showing | On macOS, check System Preferences → Security |

### Database Issues

| Problem | Solution |
|---------|----------|
| RLS blocking queries | Ensure user is authenticated before queries |
| Realtime not triggering | Verify table is enabled in Replication settings |
| Functions not found | Re-run schema.sql in SQL Editor |

---

## Quick Reference

### Environment Variables

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Key Commands

```bash
# Web App
npm run dev      # Start development server
npm run build    # Build for production

# Desktop Agent
cd electron
npm run dev      # Start in dev mode
npm run build    # Build installer
```

### Key URLs

- Supabase Dashboard: `https://supabase.com/dashboard`
- Local Web App: `http://localhost:5173`
- Supabase Docs: `https://supabase.com/docs`

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FOLDERFORGE SYNC                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐         ┌──────────────┐         ┌─────────────┐ │
│   │   Web App    │◀───────▶│   Supabase   │◀───────▶│  Desktop    │ │
│   │   (React)    │         │   (Cloud)    │         │   Agent     │ │
│   │              │         │              │         │  (Electron) │ │
│   │  • Builder   │         │  • Database  │         │             │ │
│   │  • Templates │         │  • Auth      │         │  • Creates  │ │
│   │  • Sharing   │         │  • Realtime  │         │    folders  │ │
│   │  • Devices   │         │  • Storage   │         │  • Syncs    │ │
│   └──────────────┘         └──────────────┘         └─────────────┘ │
│                                                                      │
│   localhost:5173            *.supabase.co            System Tray    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

You're all set! 🎉
