# FolderForge Sync - Setup Checklist

Print this and check off each step as you complete it.

---

## Phase 1: Supabase Setup (10 mins)

- [ ] Create account at supabase.com
- [ ] Create new project named "folderforge-sync"
- [ ] Wait for project to provision (~2 mins)
- [ ] Copy **Project URL**: `________________________`
- [ ] Copy **anon key**: `________________________`
- [ ] Go to SQL Editor → New Query
- [ ] Paste contents of `supabase/schema.sql`
- [ ] Click Run → Verify "Success"
- [ ] Go to Table Editor → Verify 9 tables exist
- [ ] Go to Database → Replication
- [ ] Enable Realtime for: templates, folders, devices, template_collaborators, sync_queue

---

## Phase 2: Web App Setup (5 mins)

- [ ] Copy `.env.example` to `.env`
- [ ] Add Supabase URL to `.env`
- [ ] Add Supabase anon key to `.env`
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:5173
- [ ] Create account (sign up)
- [ ] Verify login works

---

## Phase 3: Desktop Agent Setup (5 mins)

- [ ] `cd electron`
- [ ] Run `npm install`
- [ ] Run `node generate-icons.js`
- [ ] Run `npm run dev`
- [ ] Verify tray icon appears

---

## Phase 4: Connect & Test (5 mins)

- [ ] In web app: Go to Devices → Add Device
- [ ] Enter device name
- [ ] Click "Generate Token"
- [ ] Copy all 3 credentials
- [ ] Click tray icon → Settings
- [ ] Paste Supabase URL
- [ ] Paste Supabase anon key
- [ ] Paste Device Token
- [ ] Click "Test Connection" → Verify success
- [ ] Click "Save & Connect"
- [ ] Verify tray shows "● Connected"
- [ ] In web app: Verify device shows "Online"

---

## Phase 5: End-to-End Test (5 mins)

- [ ] Create a template in Template Builder
- [ ] Add a few folders to the template
- [ ] Go to Templates → Click "Apply"
- [ ] Select your device
- [ ] Enter a test path
- [ ] Click "Create Folders"
- [ ] Verify notification appears on desktop
- [ ] Open the path → Verify folders exist

---

## ✅ Complete!

Total time: ~30 minutes

---

## Quick Commands Reference

```bash
# Web App (from project root)
npm run dev          # Start development
npm run build        # Build for production

# Desktop Agent (from /electron folder)
npm run dev          # Start development
npm run build        # Build installer
npm run build:win    # Windows only
npm run build:mac    # macOS only
npm run build:linux  # Linux only
```

---

## Credentials Storage

Keep these safe:

| Credential | Value |
|------------|-------|
| Supabase URL | |
| Supabase anon key | |
| Database password | |
| Device token | |
