# ApplyBuddy - Agent Instructions

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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **apply-mate** (750 symbols, 907 relationships, 6 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/apply-mate/context` | Codebase overview, check index freshness |
| `gitnexus://repo/apply-mate/clusters` | All functional areas |
| `gitnexus://repo/apply-mate/processes` | All execution flows |
| `gitnexus://repo/apply-mate/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
