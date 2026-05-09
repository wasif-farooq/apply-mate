# ApplyBuddy Chrome Extension + Shared UI Plan

## Overview

Transform ApplyBuddy into a **monorepo** with:
- **Shared React component library** (`@applybuddy/ui`)
- **Next.js frontend** (existing)
- **React-based Chrome extension** (new)

Extension has **independent auth** but reads AI settings from backend. Users upload resume directly in extension.

---

## Final Architecture

```
job-applier/                              # Root monorepo
│
├── package.json                        # Workspace root (pnpm)
├── pnpm-workspace.yaml
├── turbo.json                          # Build orchestration
│
├── packages/
│   │
│   ├── ui/                             # SHARED React components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   │   └── useApi.ts
│   │   │   ├── styles/
│   │   │   │   └── tokens.ts           # CSS design tokens
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                         # Shared utilities
│       ├── src/
│       │   ├── types.ts                # API types, models
│       │   ├── api-client.ts           # API client
│       │   └── constants.ts
│       └── package.json
│
├── apps/
│   │
│   ├── frontend/                       # Next.js (existing, minimal changes)
│   │   ├── src/
│   │   │   ├── app/apply/page.tsx      # Uses @applymate/ui
│   │   │   └── ...
│   │   └── package.json                # Add workspace dependency
│   │
│   └── extension/                      # Chrome extension (NEW)
│       ├── public/
│       │   ├── manifest.json
│       │   ├── popup.html              # Entry point (loads React)
│       │   ├── auth.html               # OAuth redirect handler
│       │   └── icons/
│       ├── src/
│       │   ├── popup/
│       │   │   ├── main.tsx            # React entry
│       │   │   ├── App.tsx             # Main component
│       │   │   ├── pages/
│       │   │   │   ├── LoginPage.tsx
│       │   │   │   ├── ApplyPage.tsx
│       │   │   │   ├── PreviewPage.tsx
│       │   │   │   └── SettingsPage.tsx
│       │   │   └── components/         # Extension-specific
│       │   ├── auth/
│       │   │   └── Callback.tsx
│       │   └── styles/
│       │       └── popup.css
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts              # Build config
│
├── backend/                            # Existing (no changes)
│   ├── app/routes/
│   ├── services/
│   ├── main.py
│   └── requirements.txt
```

---

## Auth Flow

```
Extension Popup
       │
       ├─ Not logged in? → Show "Sign in with Google" button
       │
       └─ Click "Sign in"
              │
              ▼
       auth.html (popup window)
              │
              ▼
       Redirect to Google OAuth
              │
              ▼
       /auth/callback?code=...&state=...
              │
              ▼
       Callback page saves tokens to chrome.storage.local
              │
              ▼
       Window closes, popup reads token
              │
              ▼
       All API calls include: Authorization: Bearer <token>
```

---

## Extension Pages

| Page | Purpose |
|------|---------|
| **Login** | Sign in with Google, show when not authenticated |
| **Apply** | URL input, resume upload, loading state, generate button |
| **Preview** | Email subject/body preview + edit, send button |
| **Settings** | Configure backend URL, manage account |

---

## Data Flow

```
User copies LinkedIn URL (manual paste)
       │
       ▼
Extension reads URL, user clicks "Apply"
       │
       ▼
Call backend: POST /api/apply (with auth, model, resume)
       │
       ▼
Backend returns: { subject, body, email, company, ... }
       │
       ▼
Show email preview in extension
       │
       ▼
User edits (optional), clicks "Send"
       │
       ▼
Call backend: POST /api/send (with email data)
       │
       ▼
Backend sends via Gmail API
       │
       ▼
Show success/error in extension
```

---

## Shared Components to Build

| Component | Used In | Purpose |
|-----------|---------|---------|
| `Button` | Both | Primary/secondary variants |
| `Input` | Both | Text, URL, email inputs |
| `Toast` | Both | Success/error notifications |
| `LoadingSpinner` | Both | Loading states |
| `EmailPreview` | Both | Render email body HTML |
| `ResumeUploader` | Both | Drag-drop PDF upload |
| `StepIndicator` | Both | Progress steps (URL→Resume→Processing→Preview) |

---

## API Endpoints Extension Uses

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/settings` | GET | Fetch user's AI model/provider |
| `POST /api/apply` | POST | Generate email from LinkedIn URL |
| `POST /api/upload-resume` | POST | Upload resume PDF |
| `POST /api/send` | POST | Send generated email |
| `GET /auth/google` | GET | Initiate OAuth (extension auth) |
| `GET /auth/callback` | GET | OAuth callback |

---

## Backend Changes Needed

1. **OAuth for extension** - Extension needs its own Google OAuth credentials (separate from web app). Add `EXTENSION_GOOGLE_CLIENT_ID` env var.

2. **CORS settings** - Allow requests from `chrome-extension://<id>`.

3. **Settings endpoint** - Already exists, extension will call it.

---

## Implementation Steps

### Phase 1: Monorepo Setup
1. Create `package.json`, `pnpm-workspace.yaml`, `turbo.json`
2. Move frontend into `apps/frontend/`
3. Create `packages/ui/` structure
4. Create `packages/shared/` structure

### Phase 2: Shared UI Components
5. Build core components (Button, Input, Toast)
6. Build EmailPreview component
7. Build ResumeUploader component

### Phase 3: Frontend Migration
8. Update frontend to use shared components
9. Verify existing functionality still works

### Phase 4: Extension Setup
10. Create `apps/extension/` with Vite + React
11. Set up manifest.json, popup.html
12. Build extension pages (Login, Apply, Preview, Settings)

### Phase 5: Extension Auth
13. Implement OAuth flow for extension
14. Token storage in chrome.storage.local

### Phase 6: Integration
15. Connect extension to backend API
16. Test full apply workflow
17. Add loading states, error handling

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Package Manager | pnpm |
| Monorepo Tool | Turborepo |
| Shared UI | React 18 + TypeScript |
| Extension Bundler | Vite |
| Extension Framework | React (injected via Vite build) |
| Backend | FastAPI (existing) |

---

## Design Decisions

| Decision | Value |
|----------|-------|
| Package manager | pnpm |
| Monorepo tool | Turborepo |
| Extension width | 600px |
| Auth | Independent (separate Google OAuth for extension) |
| AI Model source | Read from backend API |
| Resume handling | Upload directly in extension |
| Backend URL | Configurable in extension settings |
| Session sharing | No (extension has independent auth) |
| API polling | No polling |

---

## Notes

- Extension has its own Google OAuth credentials (`EXTENSION_GOOGLE_CLIENT_ID`)
- Extension reads user's AI model settings from `/api/settings` endpoint
- Users upload resume directly in the extension
- Backend URL is configurable in extension settings (not hardcoded)
- Extension uses same API endpoints as frontend but with extension-specific auth tokens