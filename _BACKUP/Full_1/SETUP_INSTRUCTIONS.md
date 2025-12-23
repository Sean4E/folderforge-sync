# FolderForge Sync - Complete Setup Guide

## Overview

FolderForge Sync is your ultimate folder architecture application with:
- **Web App** - Create and manage folder templates in your browser
- **Desktop Agent** - Syncs templates to folders on your computers
- **Real-time Sync** - Changes update instantly across all devices
- **Sharing** - Share templates or collaborate with others

---

## Project Structure (Created for You)

```
FolderStructure_v3/
├── webapp/              <- Web Application (React + Vite)
│   ├── src/
│   │   ├── components/  <- UI components
│   │   └── lib/         <- Auth, hooks, Supabase client
│   ├── package.json
│   └── ...config files
│
├── desktop/             <- Desktop Agent (Electron)
│   ├── main.js
│   ├── settings.html
│   └── package.json
│
├── database/            <- Database Schema
│   └── schema.sql       <- Copy to Supabase SQL Editor
│
└── _GUIDES/             <- Original documentation
```

---

## STEP 1: Set Up Supabase (Your Cloud Backend)

### 1.1 Create Supabase Account & Project

1. Go to **https://supabase.com**
2. Click **"Start your project"** (it's free)
3. Sign in with GitHub or email
4. Click **"New Project"**
5. Fill in:
   - **Name**: `folderforge-sync`
   - **Database Password**: Create a strong one (save this!)
   - **Region**: Choose closest to you
6. Click **"Create new project"**
7. Wait ~2 minutes for setup

### 1.2 Set Up the Database

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file: `database/schema.sql` from your project
4. Copy ALL the contents (Ctrl+A, Ctrl+C)
5. Paste into the SQL Editor
6. Click **"Run"** (or Ctrl+Enter)
7. You should see "Success. No rows returned" - that's good!

### 1.3 Get Your API Credentials

1. Click **"Project Settings"** (gear icon) in left sidebar
2. Click **"API"** under Configuration
3. You need TWO things - copy them somewhere safe:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...` (long key)

### 1.4 Enable Authentication Providers (Optional but Recommended)

For Google/GitHub login:

1. Click **"Authentication"** in left sidebar
2. Click **"Providers"**
3. Enable **Google**:
   - Get credentials from Google Cloud Console
4. Enable **GitHub**:
   - Get credentials from GitHub Developer Settings

---

## STEP 2: Set Up the Web Application

### 2.1 Install Node.js (Required)

1. Go to **https://nodejs.org**
2. Download the **LTS** version (green button)
3. Run the installer, click Next through everything
4. Restart your computer after installation

### 2.2 Configure Environment Variables

1. Navigate to your `webapp` folder
2. Find the file `.env.example`
3. Make a COPY and rename it to just `.env`
4. Open `.env` in any text editor (Notepad is fine)
5. Fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
VITE_APP_URL=http://localhost:5173
```

6. Save the file

### 2.3 Install Dependencies & Run (Using VS Code)

**If you have VS Code:**

1. Open VS Code
2. File > Open Folder > Select `webapp` folder
3. View > Terminal (this opens a panel at bottom)
4. Type: `npm install` and press Enter
5. Wait for it to finish (~1-2 minutes)
6. Type: `npm run dev` and press Enter
7. Your browser should open to `http://localhost:5173`

**If you don't have VS Code:**

1. Open **File Explorer**
2. Navigate to your `webapp` folder
3. Click in the address bar
4. Type `cmd` and press Enter (opens Command Prompt here)
5. Type: `npm install` and press Enter
6. Wait for it to finish
7. Type: `npm run dev` and press Enter
8. Open your browser to `http://localhost:5173`

### 2.4 Test Your Web App

1. You should see the FolderForge login screen
2. Click **"Sign Up"** tab
3. Create an account with your email
4. Check your email and click the confirmation link
5. Sign in - you should see the dashboard!

---

## STEP 3: Set Up Desktop Agent

### 3.1 Install Dependencies

1. Navigate to your `desktop` folder
2. Open command prompt/terminal in that folder (same method as above)
3. Type: `npm install` and press Enter
4. Wait for it to finish

### 3.2 Run the Desktop Agent

1. Type: `npm start` and press Enter
2. A settings window should appear
3. You'll also see a tray icon (system tray near clock)

### 3.3 Configure Desktop Agent

In the Settings window:

1. **Supabase URL**: Paste your project URL
2. **Supabase Anon Key**: Paste your anon key
3. **Device Token**: You'll get this from the web app (see next step)
4. **Default Path**: Click "Browse" and select where you want folders created (e.g., `C:\Projects`)

### 3.4 Register This Device in Web App

1. Go to your web app (http://localhost:5173)
2. Click **"Devices"** in the sidebar
3. Click **"Add Device"**
4. Give it a name (e.g., "Main PC")
5. A **Device Token** will be generated - COPY this
6. Paste it into the Desktop Agent settings
7. Click **"Save Settings"**
8. Click **"Test Connection"** - should say "Connected"

---

## STEP 4: Using FolderForge Sync

### Creating Templates

1. Click **"Template Builder"** in the sidebar
2. Use **"Add Folder"** to create your structure
3. Click on folders to add subfolders
4. Rename folders by clicking the edit icon
5. Changes save automatically

### Applying Templates to Your Computer

1. Go to **"Templates"**
2. Click **"Apply"** on any template
3. Select your target device (must be online - green indicator)
4. Optionally specify a custom path
5. Click **"Create Folders"**
6. Watch the folders appear on your computer!

### Sharing Templates

**Copy Mode** (recipient gets their own copy):
1. Click **"Share"** on a template
2. Click **"Share Copy"** tab
3. Click **"Copy"** to copy the link
4. Send link to anyone - they'll get their own version

**Collaborate Mode** (real-time editing together):
1. Click **"Share"** on a template
2. Click **"Collaborate"** tab
3. Enter colleague's email
4. Click **"Invite"**
5. They can edit, and you both see changes instantly

---

## STEP 5: Multiple Computers Setup

To use on another computer:

1. Install Node.js on that computer
2. Copy the `desktop` folder to it (or download from cloud storage)
3. Run `npm install` then `npm start`
4. In the web app, register this as a new device
5. Configure with the same Supabase URL/Key + new device token
6. Now templates sync to BOTH computers!

---

## Building for Production

### Web App - Deploy to Vercel (Free & Easy)

1. Go to **https://vercel.com**
2. Sign up with GitHub
3. Click **"Import Project"**
4. Connect your GitHub and upload your `webapp` folder
5. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL` (your Vercel URL)
6. Deploy!

### Desktop App - Create Installers

In the `desktop` folder:

- **Windows**: Run `npm run build:win`
- **Mac**: Run `npm run build:mac`
- **Linux**: Run `npm run build:linux`

Installers will be in the `dist` folder.

---

## Troubleshooting

### "npm not found"
- Restart your computer after installing Node.js
- Reinstall Node.js if still not working

### "Connection failed"
- Check your Supabase URL and Key are correct
- Make sure you ran the SQL schema in Supabase
- Check if your device token matches what's in the web app

### Web app shows blank page
- Make sure `.env` file exists with correct values
- Try `npm run dev` again

### Desktop agent won't connect
- Verify all three fields are filled in settings
- Make sure the device token was copied from the web app
- Check if the device is registered in the web app

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR BROWSER                            │
│                    Web App (React)                           │
│     Create templates, manage devices, share & collaborate    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE CLOUD                          │
│    PostgreSQL Database + Real-time Subscriptions + Auth      │
│     (All your data syncs here in real-time)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 DESKTOP AGENTS (Electron)                    │
│   Computer 1          Computer 2          Computer 3         │
│   Receives sync       Receives sync       Receives sync      │
│   Creates folders     Creates folders     Creates folders    │
└─────────────────────────────────────────────────────────────┘
```

---

## What's Next?

- Create your first template structure
- Install the desktop agent on all your computers
- Share a template with a friend to test collaboration
- Explore the beautiful glassmorphism UI!

Enjoy your new folder management superpower!
