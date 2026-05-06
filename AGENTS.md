# ApplyMate - Agent Instructions

## Project Overview
AI-powered job application assistant that automates applying to jobs via LinkedIn posts.

## Project Structure
```
job-applier/
├── backend/               # Python FastAPI backend
│   ├── main.py           # API endpoints
│   ├── config.py         # Configuration
│   ├── requirements.txt  # Dependencies
│   ├── src/              # Core logic
│   └── venv/            # Python virtual env
│
├── frontend/             # Next.js React frontend
│   ├── src/
│   │   ├── app/         # Pages
│   │   ├── components/  # UI components
│   │   ├── lib/         # API client
│   │   └── styles/       # CSS tokens
│   └── package.json
│
├── DESIGN.md            # Design system (MongoDB-inspired)
└── AGENTS.md           # This file
```

## Quick Start

### Backend
```bash
cd backend
source venv/bin/activate
python main.py
# Runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/apply` | POST | Process LinkedIn URL, return generated email |
| `/api/send` | POST | Send the email after user approval |
| `/health` | GET | Check API health |

## Environment Variables (`.env`)

```
# Backend
AI_PROVIDER=ollama
OLLAMA_MODEL=gemma4:e2b
```

## Frontend Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Landing page |
| Apply | `/apply` | Input LinkedIn URL, preview email, send |

## Notes
- Backend runs on port 8000
- Frontend runs on port 3000
- API base URL: http://localhost:8000
- Logs saved to `backend/logs/`