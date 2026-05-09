# ApplyBuddy Chrome Extension

A Chrome extension that provides a full job application workflow directly in your browser popup.

## Features

- **Google OAuth** - Sign in with your Google account
- **LinkedIn URL Input** - Paste LinkedIn job post URLs
- **Resume Upload** - Upload your resume directly in the extension
- **AI Email Generation** - Generates personalized application emails
- **Email Preview & Edit** - Review and edit before sending
- **Configurable Backend** - Connect to your own ApplyBuddy backend

## Architecture

This is part of a monorepo with the following structure:

```
job-applier/
├── apps/
│   ├── frontend/     # Next.js web app
│   └── extension/     # Chrome extension (React + Vite)
├── packages/
│   ├── ui/           # Shared React components
│   └── shared/       # Shared types & API client
```

## Development

### Prerequisites

- Node.js 18+
- pnpm 9+

### Install Dependencies

```bash
pnpm install
```

### Build Extension

```bash
cd apps/extension
pnpm build
```

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `apps/extension/dist` folder

### Development Mode

```bash
cd apps/extension
pnpm dev
```

This starts Vite in watch mode. After making changes, rebuild the extension and reload it in Chrome.

## Backend Requirements

The extension requires a running ApplyBuddy backend. By default, it connects to:
- Development: `http://localhost:8000`
- Production: Configure your deployed backend URL in extension settings

### Required Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/google` | GET | Initiate Google OAuth |
| `/auth/callback` | GET | OAuth callback |
| `/api/settings` | GET | Get user settings |
| `/api/apply` | POST | Generate email |
| `/api/upload-resume` | POST | Upload resume |
| `/api/send` | POST | Send email |

## Configuration

Click the extension icon → Settings to:
- Configure backend URL
- Sign out
- Test connection

## Extension Auth

The extension uses its own Google OAuth credentials (separate from the web app). This allows independent authentication while still leveraging the same backend API.

## License

MIT