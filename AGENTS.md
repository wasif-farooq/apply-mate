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

## Production Deployment

### Architecture

| Component | Location |
|-----------|-----------|
| Backend | Railway (Python service) |
| Database | Railway PostgreSQL |
| Frontend | Cloudflare Pages |
| API Domain | api.applybuddy.net → Railway |

---

### Railway Backend Deployment

#### Prerequisites
- Railway account (paid plan required)
- Cloudflare account with applybuddy.net zone

#### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

#### Step 2: Create Railway Project
```bash
railway init --name applybuddy-backend
# Select workspace: Wasif Farooq's Projects
# Select environment: production
railway link -p <project-id>
```

#### Step 3: Add Services
```bash
# Add PostgreSQL
railway add --database postgres

# Add Backend Service (Empty)
railway add --service backend-api
```

#### Step 4: Configure Backend Service

Set environment variables (get project-id, environment-id, service-id from Railway dashboard):

```bash
# Set environment variables
railway set --variables "JWT_SECRET=<generate-32-char-random-string>"
railway set --variables "CORS_ORIGINS=[\"https://applybuddy.net\"]"
railway set --variables "FRONTEND_URL=https://applybuddy.net"

# Get DATABASE_URL from PostgreSQL service
railway variables --service Postgres
# Copy DATABASE_URL and set it for backend-api
railway set --variables "DATABASE_URL=<postgres-database-url>"
```

Add persistent volume for uploads:
```bash
railway volume create --name uploads --mount-path /app/uploads
```

#### Step 5: Configure Start Command
```bash
railway update --start-command "sh -c \"uvicorn main:app --host 0.0.0.0 --port $PORT\""
```

#### Step 6: Deploy Backend
```bash
cd backend
railway up . --path-as-root --detach
```

#### Step 7: Generate Domain
```bash
railway domain
# Result: https://backend-api-production-xxxx.up.railway.app
```

#### Step 8: Configure Cloudflare DNS

In Cloudflare Dashboard for applybuddy.net:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | api | backend-api-production-xxxx.up.railway.app | Proxied |

#### Step 9: Update Frontend Environment

In Cloudflare Pages settings:
```
NEXT_PUBLIC_API_URL=https://api.applybuddy.net
```

#### Step 10: Verify Deployment
```bash
# Test Railway URL
curl https://backend-api-production-xxxx.up.railway.app/health

# Test custom domain (after DNS propagates)
curl https://api.applybuddy.net/health
```

---

### Environment Variables Reference

| Variable | Backend | Frontend | Required |
|----------|---------|----------|----------|
| DATABASE_URL | ✅ (auto from Railway) | - | Yes |
| JWT_SECRET | ✅ | - | Yes (generate 32+ chars) |
| CORS_ORIGINS | ✅ (JSON array) | - | Yes |
| FRONTEND_URL | ✅ | - | Yes |
| NEXT_PUBLIC_API_URL | - | ✅ | Yes |
| AI_PROVIDER | ✅ (user configures) | - | No |
| OPENAI_API_KEY | ✅ (user configures) | - | No |
| GOOGLE_CLIENT_ID | ✅ (user configures) | - | No |

---

### Chrome Extension Deployment

1. Update `apps/extension/.env.production` with production values
2. Build: `cd apps/extension && pnpm build`
3. Upload `apps/extension/dist` to Chrome Web Store Developer Dashboard

---

### Troubleshooting

#### Issue: `$PORT` not a valid integer
**Cause**: Uvicorn expects an integer, not `$PORT` literal
**Solution**: Use `sh -c "uvicorn main:app --host 0.0.0.0 --port $PORT"` to properly interpolate

#### Issue: CORS_ORIGINS fails to parse
**Cause**: Pydantic tries to parse List[str] as JSON
**Solution**: Pass as JSON array: `CORS_ORIGINS=["https://applybuddy.net"]`

#### Issue: DATABASE_URL not available
**Cause**: DATABASE_URL not shared between services by default
**Solution**: Get from PostgreSQL service variables, explicitly add to backend service

#### Issue: Deployment fails with security vulnerabilities
**Cause**: Uploading entire monorepo includes vulnerable packages from other services
**Solution**: Use `--path-as-root` flag to upload only backend/ directory

#### Issue: 502 Bad Gateway
**Cause**: App not listening on Railway's assigned port
**Solution**: Ensure start command uses `$PORT` variable, not hardcoded port

#### Issue: "Application failed to respond"
**Cause**: App crashed during startup (check logs with `railway logs`)
**Solution**: Common causes - missing DATABASE_URL, invalid CORS_ORIGINS format, missing JWT_SECRET

#### Issue: Trial expired
**Cause**: Railway trial period ended
**Solution**: Select a paid plan at railway.app/account

#### Issue: Security Vulnerabilities Block Deployment
**Cause**: Railway scans entire repo and finds vulnerable packages (e.g., next@14.2.3 CVEs)
**Solution**:
1. Create `.railwayignore` to exclude problematic directories
2. Or fix the vulnerable package in the source (e.g., upgrade Next.js in package.json and regenerate lockfile)
3. Commit and push, Railway auto-deploys from GitHub

#### Issue: "failed to read Dockerfile at 'Dockerfile'"
**Cause**: Root directory misconfigured - Railway can't find Dockerfile relative to root
**Solution**:
1. Set `root_directory` to `backend` (or correct subdirectory containing Dockerfile)
2. Use Railway dashboard or CLI: `railway update --root-directory backend`
3. Commit and push to trigger fresh deploy from GitHub

#### Issue: Railwayignore Not Working
**Cause**: `.railwayignore` only affects security scan, not Dockerfile discovery
**Solution**: Always ensure `root_directory` points to correct location containing Dockerfile

---

### Fresh Railway Backend Deployment Checklist

Use when deploying backend from scratch or after major changes.

#### Pre-Deployment
- [ ] Ensure `backend/Dockerfile` exists and is valid
- [ ] Check `apps/frontend/package.json` for vulnerable dependencies (e.g., next.js version)
- [ ] Update any packages with known CVEs before deploying
- [ ] Generate new JWT_SECRET: `openssl rand -base64 32`
- [ ] Ensure Railway project has PostgreSQL service running

#### Deployment Steps (MCP Tools)
```python
# 1. Get project info
railway_list_projects()  # Find project_id: 1fe240d9-8154-4af7-91ac-4c755c47386a
railway_list_services()  # Find backend service_id

# 2. Generate and set JWT_SECRET
openssl rand -base64 32  # Generate secret
railway_set_variables(
  project_id="1fe240d9-8154-4af7-91ac-4c755c47386a",
  service_id="331db7b6-9385-47ef-b4f9-76de6bb506d9",
  variables={"JWT_SECRET": "generated-secret"}
)

# 3. Configure service settings
railway_update_service(
  project_id="1fe240d9-8154-4af7-91ac-4c755c47386a",
  service_id="331db7b6-9385-47ef-b4f9-76de6bb506d9",
  root_directory="backend"  # Critical - points to Dockerfile location
)

# 4. Push code to GitHub (Railway deploys from GitHub source)
git add . && git commit -m "deploy: fresh backend deploy" && git push

# 5. Or deploy directly via CLI
railway_deploy(
  project_id="1fe240d9-8154-4af7-91ac-4c755c47386a",
  service_id="331db7b6-9385-47ef-b4f9-76de6bb506d9",
  message="deploy message"
)
```

#### Post-Deployment Verification
```bash
# Check status
railway_environment_status(project_id="1fe240d9-...")

# Check logs
railway_get_logs(deployment_id="...", log_type="build")
railway_get_logs(deployment_id="...", log_type="deploy")

# Verify health endpoint
curl https://backend-api-production-xxxx.up.railway.app/health
```

#### User Configuration (in Railway Dashboard)
After deploy, user must add their own credentials:
- `AI_PROVIDER` (openai/anthropic/google)
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY`
- `GMAIL_EMAIL` + `GMAIL_APP_PASSWORD` (optional)

---

### Cost Estimate (Railway)

| Component | Approximate Cost |
|-----------|-----------------|
| Python Service | $5-10/month |
| PostgreSQL | $5/month |
| Persistent Volume | $1/month |
| **Total** | ~$11-16/month |

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
