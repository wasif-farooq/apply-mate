# Restructure: fixed model, stored resume text, typed agents, LinkedIn extension

## Context

ApplyBuddy generates and sends tailored job-application emails from LinkedIn posts. Three things have accumulated that this restructure fixes.

**The provider layer is over-built and is the main source of user-facing failure.** Users pick an AI provider, a model, and paste an API key in Settings. That decision fans out into three separate provider-switch implementations (`services/agents/team.py:_build_model_client`, `services/ai_service.py:LLMService`, `src/ai/llm.py:LLMProvider` — only the first is reachable), two DB tables (`provider_configs`, `provider_models`), two `user_settings` columns, nine settings endpoints, a 307-line `useSettings` hook, and roughly 600 lines of settings UI. Every one of those knobs is a way for the app to fail on a model the user picked badly, a key they pasted wrong, or a free tier they exhausted. Collapsing to one server-side model (Alibaba DashScope, `qwen3.5-flash`) deletes the entire surface.

**The LLM is fed filesystem paths and a chat transcript.** `run_apply_team` hands the model a resume *file path* and an agent re-parses the PDF on every single apply. Results are then recovered by running fifteen unanchored regexes over the concatenated transcript of every agent message — `SKILLS:` matches inside `REQUIRED_SKILLS:`, `BODY:` truncates on any capitalised `Word:` line in the HTML, and `ACHIEVEMENTS:` is emitted but never parsed. Extracting PDF text once at upload and giving agents typed structured output removes both classes of bug.

**Server-side LinkedIn scraping is the weakest link.** `linkedin_parser.py` fetches logged-out HTML against 2023-vintage CSS selectors, detects a login wall by looking for the string "sign in" (present in every LinkedIn nav), caches with a TTL that never expires (`hash(url) // 300` is constant), and degrades to a dict of empty strings that the agent then hallucinates on top of. A Chrome extension reading the DOM inside the user's own logged-in session sees the real content. Backend scraping stays as the web app's fallback, but the extension becomes the good path.

The intended outcome: one model, no AI settings, resume text in the database, agents with typed contracts, and an extension that captures LinkedIn posts directly.

## Locked decisions

| Decision | Choice |
|---|---|
| AI key | Single server env var `DASHSCOPE_API_KEY`; no per-user keys |
| Endpoint | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (international) |
| Model | `AI_MODEL` env, default `qwen3.5-flash` |
| Agent stack | Keep AutoGen; sequential invocation + structured output, drop `SelectorGroupChat` and the regex scraper |
| Extension | Becomes the LinkedIn scraper: single-post capture **+** feed scan **+** Easy Apply, each toggleable in extension settings |
| Easy Apply | Auto-submit by default; assisted (prefill, user submits) available as a toggle |
| Web app | Keeps backend scraping for the paste-a-URL flow |
| Migrations | Introduce Alembic |

> On `qwen3.5-flash`: published DashScope ids are `qwen-flash`, `qwen-plus`, `qwen3-max`. If the API rejects `qwen3.5-flash`, `AI_MODEL` switches it with no code change and no redeploy of logic. Worth confirming against the Model Studio console before the first deploy.

> On Easy Apply auto-submit: a LinkedIn DOM change can submit a half-filled application to a real employer, and this is the part of the work most exposed to LinkedIn's automation terms. Building it as asked, defaulted to auto-submit, with the per-session cap, a required-field completeness check before submit, and a kill switch in extension settings.

---

## Phase 0 — Unbreak the build

The backend does not start today and Docker cannot build it.

- `backend/requirements.txt`: add the AutoGen runtime deps that the code already imports (`autogen-ext[openai]`, `autogen-core`, `openai`) — exact pin set in Phase 4. Verified: `import autogen_ext` → `ModuleNotFoundError`, and `services/job_service.py` imports `services.agents.team` at module scope, so this is a startup crash.
- `backend/Dockerfile`: add `RUN playwright install --with-deps chromium` after the pip install. Without it `PlaywrightScraper` throws on every call and silently falls back to `requests`.
- `backend/utils/linkedin_parser.py:337` — `ttl_hash = hash(url) // 300` is constant per URL, so `lru_cache` never expires and each entry retains a full page of `raw_html`. Use `int(time.time()) // 300`, and stop returning `raw_html` (no consumer reads it).
- `backend/app/routes/apply.py:262-266` — duplicated `user_repo` / `get_by_id` pair; `:275` builds a third `UserRepository`.

Do this first and as its own commit — everything after depends on a backend that boots.

## Phase 1 — Alembic

No migration tooling exists; `init_db()` is `Base.metadata.create_all`, which creates tables but **never adds columns**. Git history shows `user_settings.selected_model`, `selected_provider` and `users.email_config` were added with no migration in the repo — they must have been applied by hand or the DB was recreated. This phase adds columns and drops tables, so it cannot ship without migrations.

- Add `alembic` to requirements; `alembic init` into `backend/alembic/`; point `env.py` at `src.db.database:Base.metadata` and read `DATABASE_URL` from env.
- **Baseline first**: autogenerate against the current models, verify the diff is empty against a live-shaped DB, and `alembic stamp head` on the deployed database before any new revision runs.
- Replace the `init_db()` call in `main.py`'s lifespan with `alembic upgrade head` (run in `scripts/deploy.sh` / the Railway start command, not in-process — in-process migration races multiple replicas).
- Later phases each add one revision.

## Phase 2 — One fixed model

**New** `backend/core/llm.py` — the single DashScope client factory (details in Phase 4).

**`backend/core/config.py`**: delete `AI_PROVIDER`, `OLLAMA_*`, `OPENAI_*`, `ANTHROPIC_*`, `GOOGLE_*` (lines 32-41; the `GOOGLE_CLIENT_ID`/`SECRET` OAuth vars at 21-23 stay). Add `DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`, `AI_MODEL`. Note the existing `DATABASE_URL` validator at `core/config.py:55-60` never runs — Pydantic v2 does not validate defaults — so make the new key required by giving it no default and letting `Settings()` fail, or set `validate_default=True`. Mirror into `backend/.env.example`, `.env.production`, `.env.test`, `docker-compose.production.yml:30-34`.

**Delete outright**: `backend/services/ai_service.py`, `backend/src/ai/`, `backend/src/ai_generator.py`, `backend/src/agent/`, `backend/src/gmail_sender.py` (broken on import — `from .logger import logger`, no such module), `backend/src/auth.py` if unreferenced after the sweep. Drop from requirements: all six `langchain*` packages and `langgraph`. These are reachable only through `JobService.get_job_data` / `parse_resume` / `generate_email`, which have zero callers.

This is not new scope — `backend/BACKEND_STRUCTURE.md:64-70` already labels the whole `src/` tree "legacy code (to be removed after migration)" and its migration checklist has Phase 5 (*Cleanup legacy src/*) unticked. Only `src/db/` graduates: it holds the live SQLAlchemy models and session, so move it to `backend/db/` and update the ~10 `from src.db...` imports, or leave it in place and close out the doc. Prefer moving — leaving one live package inside a directory named "legacy" is how it survived this long.

**`backend/core/constants.py`**: delete `DEFAULT_PROVIDERS`, `PROVIDER_DEFAULTS`, `PROVIDER_BASE_URLS`, `DEFAULT_MODELS` and their re-exports in `core/__init__.py`. `GOOGLE_SCOPES` and `TOKEN_EXPIRE_DAYS` stay.

**Delete** `backend/repositories/provider_repo.py` entirely. Delete the AI half of `settings_repo.py` (`get_selected_model`, `set_selected_model`) and the phantom `get_resume_path` / `set_resume_path` — `UserSettings` has no `resume_path` column, so `get_resume_path` raises `AttributeError` whenever a settings row exists; it is masked today only because `ApplyRequest.resume_path` defaults to the truthy `"./resume.pdf"`. Resume selection moves to Phase 3.

**`backend/app/routes/settings.py`**: delete the nine AI routes (`GET /api/settings`, `GET|PUT providers`, `GET|PUT models`, `PUT selection`, and the three `fetch-*` model endpoints — one of which is already a hardcoded 501 stub). Keep all five email routes (lines 240-414) unchanged. Also fix `:190` and `:231`, which still leak upstream response bodies via `detail=f"Failed: {response.text}"`.

**`backend/repositories/user_repo.py:33-43`**: drop the `ProviderConfig` seeding loop from signup; keep the `UserSettings` row.

**Schema/migration**: drop tables `provider_configs`, `provider_models`; drop columns `user_settings.selected_model`, `user_settings.selected_provider`. Remove the corresponding ORM models and `User` relationships (`src/db/models.py:20-22, 40-63`) and the pydantic types in `models/schemas.py:26-80`.

**`backend/app/routes/apply.py`**: remove `provider` / `model` from `ApplyRequest` (:33-34). Neither the frontend nor the extension ever sends them, so this is not a client-visible break.

**`packages/shared/src/types.ts`**: drop `provider`/`model`/`api_key` from `ApplyRequest`, drop `ProviderConfig`/`ProviderModel`, drop `selected_provider`/`selected_model` from `Settings`. (Nothing imports this package today — the frontend and extension each redeclare their own types. Worth a follow-up, out of scope here.)

## Phase 3 — Resume text stored once, and `resume_id` instead of `resume_path`

Two problems solved together. Today the client sends an arbitrary `resume_path` string and the server reads whatever is at that path — `apply.py:236` checks only `Path(resume_path).exists()`, never ownership. A user can pass any readable server path and have its bytes emailed out (`email_service.py:45`) or its text fed to the LLM (`agents/tools.py:33`). Meanwhile the PDF is re-parsed by an LLM tool call on every apply.

**Migration**: `user_resumes` gains `resume_text TEXT NULL`, `extracted_at TIMESTAMPTZ NULL`, `char_count INT NULL`.

**`backend/utils/resume_handler.py`**: harden `extract_text_from_pdf` — `page.extract_text()` returns `None` for image-only pages, so today `"\n".join(...)` raises `TypeError`. Filter `None`, cap pages, raise a typed `ResumeParseError` on empty output. Delete `load_resume` and `encode_resume_base64` (zero callers).

**`backend/app/routes/apply.py:75-120` (`upload_resume`)**: extract text between the file write and `resume_repo.create`, and persist it. Extraction failure should return 422 with a clear message rather than storing an unusable resume. Also fix the bare `except Exception` at `:118-120` that swallows the inner `HTTPException`s and turns a 400 "Only PDF files are allowed" into a 500, and widen the timestamp in the stored filename (`:92`) — second granularity means two uploads in the same second by one user silently overwrite.

**`ResumeRepository`**: `create()` takes `resume_text`; add `get_default(user_id)` to the live path (it exists at `resume_repo.py:36-40` with zero callers today); `delete()` should unlink the file, not just the row.

**API contract change**: `ApplyRequest` and `SendRequest` take `resume_id: int | None` instead of `resume_path: str`. The server resolves it through `ResumeRepository.get_by_id(resume_id, current_user.id)` — which already enforces ownership — falling back to `get_default(user_id)`. `apply_to_job` receives `resume_text`; `send_job_email` receives the resolved `UserResume` and reads `file_path` for the MIME attachment. The PDF on disk is still needed, but **only** at send time.

Update callers: `apps/frontend/src/hooks/useApplyFlow.ts:150-153, 169-175, 191-197` (stop resolving `file_path` client-side, send `selectedResumeId`), `apps/extension/src/popup/pages/ApplyPage.tsx:67`, `apps/extension/src/services/api.ts:3-6`.

**Note for deploy**: `backend/uploads/` has no Docker volume (`Dockerfile:17` is a bare `mkdir`), so on Railway every redeploy wipes uploaded PDFs while the DB rows survive, leaving dangling `file_path`s. Storing the text fixes the AI path permanently; the attachment path still needs a volume or object storage. Flagging as a known gap — not fixing it in this restructure unless you want it in scope.

## Phase 4 — Agent layer

**Pins.** Move off `autogen-agentchat==0.4.9` to the 0.7 line and add the packages the code already imports:

```
autogen-agentchat==0.7.5
autogen-ext[openai]==0.7.5
autogen-core==0.7.5
openai>=1.60
```

Verified against the published wheels, not assumed: `autogen_agentchat/agents/_assistant_agent.py` in 0.7.5 accepts `output_content_type: type[BaseModel] | None` and responds with a `StructuredMessage`. This is the mechanism that replaces regex scraping, and it does not exist in the currently pinned 0.4.9.

**`backend/core/llm.py`** (new) — one DashScope client. `autogen_core.models.ModelInfo` requires `vision`, `function_calling`, `json_output`, `family`, `structured_output`; Qwen is not in AutoGen's model registry so all of them must be passed explicitly:

```python
model_info = {
    "vision": False, "function_calling": True, "json_output": True,
    "family": ModelFamily.UNKNOWN, "structured_output": True,
    "multiple_system_messages": True,
}
```

Note the current code hardcodes `"json_output": False` (`team.py:125,152`) — that is precisely why the pipeline was stuck parsing strings.

**Lifecycle**: build one client in the FastAPI `lifespan`, hold it on `app.state`, `await client.close()` on shutdown. Today a client is constructed per request and never closed, leaking an httpx pool each time.

**Make the apply path async.** This is required, not cosmetic: `apply_to_job` is sync and calls `asyncio.run` (`job_service.py:186`), which creates a fresh event loop per request — a shared httpx-backed client binds to the first loop that uses it and cannot be reused across those. Make `POST /api/apply` and `JobService.apply_to_job` `async def` and `await` the pipeline. Keep the sync SQLAlchemy `Session`; the queries here are short and local, and wrapping them in `fastapi.concurrency.run_in_threadpool` is the tidy follow-up if loop-blocking ever shows up in latency. Do **not** migrate to async SQLAlchemy.

**`services/agents/schemas.py`** (replaces `types.py`) — the Pydantic models become real LLM output contracts rather than shapes a regex fills in:

- `JobAnalysis` — `title, company, location, description, required_skills[], seniority_level`
- `ResumeAnalysis` — `name, total_experience_years, skills[], key_achievements[], matching_skills[], skill_gaps[]`
- `EmailDraft` — `subject, body`
- `Critique` — `approved: bool, issues: list[str]`

Drop `strengths` and `agent_log` (both computed and then discarded today). `key_achievements` stays as an intermediate — the writer is told to include quantified achievements — but is not persisted. `models/domain.py`'s `JobData`/`ResumeData`/`EmailContent`/`LinkedInPost` dataclasses duplicate these; delete them with the dead code that uses them.

**`services/agents/pipeline.py`** (replaces `team.py`) — explicit sequential calls, no `SelectorGroupChat`, no `_selector_func`, no `_parse_team_result`:

1. `JobAnalystAgent(post_text)` → `JobAnalysis`
2. `ResumeAnalystAgent(resume_text, job_analysis)` → `ResumeAnalysis`
3. `EmailWriterAgent(job_analysis, resume_analysis)` → `EmailDraft`
4. `EmailCriticAgent(draft)` → `Critique`; if `not approved`, feed `issues` back to the writer. Bounded at `MAX_REVISIONS` (env, default 2) — replaces `MAX_MESSAGES=10`, which silently truncated runs before the recipient was ever extracted.
5. Recipient: run the consolidated email regex over `post_text` first. Exactly one candidate → use it, zero LLM calls. Multiple → one disambiguation call. None → `None`, and `JobService` falls back to the caller-supplied `to_email`, else `EmailNotFoundError`.

Invoke via `await agent.run(task=...)`; the typed instance is the `StructuredMessage.content` of the final message. Wrap the extraction in a helper so one place handles a non-structured final message. `output_content_type` forces `reflect_on_tool_use=True` in 0.7.5 — irrelevant here because no agent keeps tools.

**Tools are gone from the agent surface.** `scrape_linkedin` and `parse_resume_pdf` disappear: agents receive post text and resume text as arguments. `extract_email_regex` becomes a plain function in `utils/email_extractor.py`. Scraping moves to `JobService`, *before* the pipeline, and runs only when the caller supplied no `post_text` (Phase 5). This also fixes the thread-safety problem — Playwright's sync API was being driven from AutoGen's executor threads.

**Delete** `RateLimitedClient` (`team.py:51-113`) and `_patch_process_create_args` (`:25-48`). The proxy's `except (RateLimitError, NotFoundError, Exception)` is just `except Exception`, its `"404" in error_str` / `"500" in error_str` substring tests misfire on unrelated text, `create_stream` bypasses the retry entirely, and its 1.5s pacing is per-request state on a per-request object, so it never paced anything globally. Replace with the `openai` SDK's own `max_retries` on the shared client, plus the existing slowapi `20/hour` route limit. The DeepSeek monkeypatch targets a private `_process_create_args` and is dead weight once there is one provider.

**Errors.** `backend/app/exceptions.py` already has a usable taxonomy that subclasses `HTTPException`, so no mapping layer is needed — the AI path just never uses it. Today every failure collapses into `ValueError("Agentic AI processing failed")` (`job_service.py:187-194`) which `apply.py:244` maps to **400**, so genuine server faults are reported to the client as bad input. Map instead:

| Cause | Exception | Status |
|---|---|---|
| Upstream quota / rate limit | new `RateLimitedError` | 429 |
| Bad key, unknown model, misconfig | new `ProviderMisconfiguredError` (log detail, generic message out) | 500 |
| Structured output fails validation after one retry | existing `ExternalServiceError` | 502 |
| Post text empty or unusable | new `UnprocessablePostError` | 422 |
| No recipient found | existing `EmailNotFoundError` | 400 |

Delete `ProviderNotConfiguredError` — it tells the user to set an API key in Settings, which will no longer exist.

**Persist the match data.** `job_analysis.required_skills`, `seniority_level`, `resume_analysis.matching_skills` and `skill_gaps` are computed today and thrown away. Add one `match_json JSONB` column to `job_applications` (one Alembic revision, one column rather than four) so the History page can show why a given application was written the way it was.

## Phase 5 — Post text as an input

`ApplyRequest` gains an optional `post_text: str | None` (and `post_html`). `JobService.apply_to_job` scrapes via `fetch_linkedin_post` **only** when `post_text` is absent. `ApplyRequest.validate_linkedin_url` (`apply.py:37-44`) must relax: when `post_text` is supplied the URL is a record-keeping field, not the content source.

This is the seam the extension writes to, and it keeps the web app's paste-a-URL flow working unchanged.

## Phase 6 — Frontend

- **Delete** `src/hooks/useSettings.ts` (307 lines) and the AI-tab components in `src/app/settings/page.tsx`: `ActiveConfig` (14-34), `ProviderSidebar` (36-97), `ProviderHeader` (99-136), `ConfigInput` (138-213), `ModelGrid` (215-277), `FetchModelsButton` (279-331), `ProviderContent` (333-402), `SaveSection` (404-441), plus `triggerModelFetch` (861-938) and the tab switcher. `EmailSettingsTab` (443-825) becomes the whole page. `useEmailSettings.ts` is untouched.
- **`src/lib/api.ts`**: delete `getSettings`, `updateProviderConfig`, `updateProviderModels`, `updateGlobalSelection` and the `Settings`/`ProviderConfig`/`ModelConfig` interfaces (118-181).
- Carry over the loose ends from the current working tree: `settings/page.tsx` lost its `loading` gate when `ProtectedRoute` was introduced, so it renders default state before settings arrive; `signOut` is now unused in four pages and `Link` in `resumes/page.tsx`; JSX inside the four `ProtectedRoute` wrappers was never re-indented.
- `src/app/privacy/page.tsx:137` and `terms/page.tsx:137` name "OpenAI, Anthropic, Google AI" as subprocessors. That becomes false — update to Alibaba Cloud.

## Phase 7 — Chrome extension

Today the extension has **no content script at all**: `manifest.json` has no `content_scripts` key, no `scripting`/`tabs` permission, and no `linkedin.com` host permission; `vite.config.ts:11-14` has exactly two rollup inputs (`popup.html`, `auth.html`). The "Job Post Detected" card in `ApplyPage.tsx:94-108` is cosmetic — it echoes back the URL the user typed. `public/background.js` is a 44-line message relay whose four message types are never sent by anything, so the service worker is free to repurpose.

**Build plumbing**
- `public/manifest.json`: add `content_scripts` matching `https://www.linkedin.com/*` at `document_idle`; add `scripting` and `tabs` permissions and the `https://www.linkedin.com/*` host permission.
- `vite.config.ts`: add a content-script input built as **IIFE**, not ESM — content scripts cannot be ES module chunks. This usually needs a second Rollup output config or a separate build step.
- `backend/core/config.py:48-53`: `CORS_ORIGINS` has no `chrome-extension://` origin. Content scripts run in the page's origin and *are* subject to CORS, so all network calls go **content script → service worker → backend**, where `host_permissions` applies and CORS does not. The service worker becomes the broker. (`PLANS/chrome-extension-plan.md:194` listed this and it was never done.)

**Capture (`src/content/`)**
- `postExtractor.ts` — extract the post/job currently in view into `{url, title, company, location, description, hasEasyApply, emails[]}`. Seed the selectors from `backend/utils/linkedin_parser.py:184-237`, but treat them as a hypothesis only: that file targets logged-out server-fetched HTML, which is a materially different DOM from the logged-in feed. Port the comment-stripping list (`:150-172`) — it exists because emails in comments were polluting extraction, and that hazard is identical in-page.
- `feedScanner.ts` — the auto-scroll crawler from `PLANS/auto-scan-linkedin-feed.md:21-31`, with that doc's own mitigations: randomised 2-5s scroll delays, a per-session post cap, fallback selector chains.
- `jobDetector.ts` — classify `job | general | ad | unknown` per `auto-scan-linkedin-feed.md:108-113`.
- `applyAutomator.ts` — Easy Apply. Auto-submit by default; a completeness check on required fields before submit; assisted mode and a global off switch in settings.

**Backend endpoints** (`backend/app/routes/feed.py`, new) — follow the shapes already specified in `PLANS/auto-scan-linkedin-feed.md:45-65`: `POST /api/feed/save-scan`, `POST /api/feed/scan`, `POST /api/feed/batch-apply`, `GET /api/feed/jobs`. Two new tables `feed_scans`, `feed_jobs` per `:181-204`, as one Alembic revision. Relevance scoring reuses the Phase 4 pipeline against the stored resume text.

**Popup**
- `ApplyPage.tsx`: replace the typed-URL input with real capture from the active tab; keep manual paste as fallback.
- New `ReviewPage.tsx` (scan queue) and `FilterSettings.tsx` (the toggles: capture / feed scan / Easy Apply mode / caps).
- Clean-up while in here: `src/auth/Callback.tsx` + `auth.html` are an abandoned redirect-OAuth design, still built into `dist/` and unreachable (nothing writes `oauth_state`); `services/auth.ts:loginWithGoogle` duplicates `hooks/useAuth.ts` and is dead; `hooks/useApi.ts` is dead but well-formed — the natural home for the new feed calls; `useResumes.ts` re-implements `services/api.ts:fetchResumes`; `useStorage.ts:82` defaults to a literal `'http://localhost:8000'` instead of `DEFAULT_BACKEND_URL`, so `VITE_API_URL` is effectively ignored at runtime; `ApplyPage.tsx:152` builds the web-app link with `backendUrl.replace('8000', '3000')`.
- `apps/extension/README.md:72-79` documents endpoints the extension never calls.

**Scope note**: Phase 7 is roughly the size of Phases 0-6 combined. It is written as one phase for coherence but should ship as at least three commits — build plumbing + single-post capture first (that alone replaces server-side scraping on the good path), then feed scan, then Easy Apply.

## Cross-cutting cleanup

`backend/credentials.json`, `apps/extension/credentials.json` and `backend/resume.pdf` exist on disk but are **not tracked and were never committed** (verified with `git log --all --` on each path) — `.gitignore` covers them. No rotation needed; noting it here only because it is easy to misread the working tree as leaking them. The tracked `.env.production` files are placeholder templates.

`backend/resume.pdf` is still the origin of the `"./resume.pdf"` defaults at `apply.py:31,71`. Remove those defaults once Phase 3 lands.

Three separate copies of the email-extraction regex exist (`utils/email_extractor.py:4-17`, `agents/tools.py:41-48`, `ai_service.py:286`) and they disagree — `tools.py:46` filters local-parts starting with `on`/`at`, which also drops `onboarding@`. Collapse to one. In `email_extractor.py` the first pattern is the bare generic address regex, so the three prefixed patterns after it (`email:`, `contact:`, `apply to:`) are unreachable — reorder.

## Verification

No test suite exists (`find` for `test_*.py` / `*.test.ts*` returns nothing) and `.pre-commit-config.yaml` already declares a `pytest` hook that will fail on an empty run. Add `pytest` + a `backend/tests/` package as part of Phase 4 so the hook passes and the agent contracts are pinned.

**Phase 0** — `docker compose -f docker-compose.production.yml build backend && docker compose up backend`; container must reach healthy (the `HEALTHCHECK` added in the current working tree hits `/health`). `docker compose exec backend python -c "import autogen_ext, autogen_core, openai; from playwright.sync_api import sync_playwright; print('ok')"`.

**Phase 1** — `alembic upgrade head` on a scratch DB, then `alembic check` reports no pending autogenerate diff.

**Phase 2** — Start with `DASHSCOPE_API_KEY` unset: startup must fail with a named error. With it set, `curl /health`. `grep -rn "provider\|api_key" backend/app/routes/ | grep -v email` should return nothing meaningful. Frontend `pnpm build` must pass with the settings page reduced to the email tab.

**Phase 3** — Upload a PDF; assert `user_resumes.resume_text` is non-empty and `char_count` is plausible. Upload an image-only PDF; expect a clean 422, not a 500. Then attempt `POST /api/apply` with another user's `resume_id` and confirm it 404s rather than reading the file.

**Phase 4** — Unit-test each agent step against a recorded post + resume fixture, asserting the typed schema validates. End-to-end: `POST /api/apply` with `post_text` for a known post; assert a real subject/body and a recipient address. Force a malformed model response and confirm the bounded retry fires and the failure maps to the right status code, not a blanket 400.

**Phase 5/7** — Load the unpacked extension from `apps/extension/dist`, open a real LinkedIn job post, capture, and confirm the popup shows the actual title/company (not the URL echo). Confirm the network call originates from the service worker, not the content script. Compare the same post through the web app's URL flow to check the two paths agree. Then a 10-post feed scan against the cap, and one Easy Apply in assisted mode before enabling auto-submit.

## Open risks

1. **`qwen3.5-flash` may not be a valid DashScope model id.** Confirm in the Model Studio console before deploy. Mitigated by `AI_MODEL` being env-driven.
2. **Structured output depends on DashScope, not on AutoGen.** AutoGen 0.7.5's `output_content_type` is confirmed present in the wheel, but whether Qwen on the OpenAI-compatible endpoint honours the JSON-schema `response_format` AutoGen sends is unverified. If it does not, the fallback is `json_output=True` plus `Model.model_validate_json` in our code with one bounded retry — same schemas, same pipeline, only the extraction helper changes. Test this against the live endpoint on day one; it is the single assumption Phase 4 rests on.

3. **Making the apply path async touches the request lifecycle.** `get_current_user`, the repos, and the session all stay sync inside an async route. Watch p95 latency on `/api/apply` after the switch; `run_in_threadpool` around the DB calls is the fix if it regresses.
4. **Alembic baselining against the live Railway database.** History shows past column additions were applied by hand, so the deployed schema may not match what autogenerate expects. Diff before stamping.
5. **LinkedIn selectors will drift**, and the logged-in DOM differs from what `linkedin_parser.py` was written against. Every selector needs a fallback chain and the extension needs a visible "capture failed" state rather than silent empties.
6. **Easy Apply auto-submit** can send a wrong application if LinkedIn changes its modal. Required-field check plus per-session cap plus kill switch; ship assisted mode first and verify before flipping the default.
