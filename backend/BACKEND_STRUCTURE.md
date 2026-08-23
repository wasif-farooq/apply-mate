# Backend Structure

## Overview

Refactored backend following Clean Architecture with service layer, repository pattern, and dependency injection.

## Directory Structure

```
backend/
├── main.py                    # FastAPI application entry point
├── config.py                  # Legacy config (to be removed)
│
├── app/                       # FastAPI application layer
│   ├── __init__.py
│   ├── deps.py                # Dependency injection (get_db, get_current_user)
│   ├── exceptions.py          # Custom exception classes
│   └── routes/               # API route handlers
│       ├── auth.py           # Authentication endpoints
│       ├── settings.py        # Settings endpoints
│       └── apply.py          # Job application endpoints
│
├── core/                      # Core infrastructure
│   ├── __init__.py
│   ├── config.py             # Pydantic Settings (replaces config.py)
│   ├── security.py           # JWT token handling
│   └── constants.py          # App constants and defaults
│
├── models/                    # Data models
│   ├── __init__.py
│   ├── db.py                 # Re-exports from src.db.models
│   ├── schemas.py            # Pydantic DTOs (request/response)
│   └── domain.py             # Domain dataclasses
│
├── alembic/                   # Schema migrations (applied by entrypoint.sh)
│   ├── env.py
│   └── versions/
│
├── db/                        # SQLAlchemy models and session (was src/db/)
│   ├── database.py
│   └── models.py
│
├── repositories/              # Data access layer (Repository Pattern)
│   ├── __init__.py
│   ├── user_repo.py          # User CRUD operations
│   ├── settings_repo.py      # User settings CRUD
│   ├── resume_repo.py        # Resumes, including the extracted text
│   ├── application_repo.py   # Generated/sent applications
│   └── feed_repo.py          # Extension feed scans and scored jobs
│
├── services/                  # Business logic layer (Service Layer)
│   ├── __init__.py
│   ├── auth_service.py       # OAuth authentication
│   ├── agents/               # Typed AI pipeline (AutoGen, structured output)
│   │   ├── pipeline.py       # job -> fit -> draft -> critic loop
│   │   ├── agents.py         # agent factories, no tools
│   │   ├── schemas.py        # the contract each step returns
│   │   ├── prompts.py
│   │   ├── structured.py     # validated object out of one agent turn
│   │   └── retry.py
│   ├── job_post_source.py    # extension text, else server-side scrape
│   ├── email_service.py      # Gmail operations
│   └── job_service.py        # Job application orchestration
│
├── utils/                     # Utility functions
│   ├── __init__.py
│   ├── linkedin_parser.py    # LinkedIn HTML parsing
│   ├── email_extractor.py    # Regex email extraction
│   ├── resume_handler.py     # PDF processing
│   └── logger.py             # Logging configuration
│
└── tests/                     # pytest, run by the pre-commit hook
```

## Design Patterns Applied

| Pattern | Implementation |
|---------|----------------|
| **Repository** | `repositories/*.py` - Abstraction for DB operations |
| **Service Layer** | `services/*.py` - Business logic isolation |
| **Singleton** | `core/llm.py` - one model client pair, owned by the app lifespan |
| **Dependency Injection** | `app/deps.py` - FastAPI Depends |
| **DTO/Schema** | `models/schemas.py` - Request/Response validation |
| **Custom Exceptions** | `app/exceptions.py` - Domain-specific exceptions |

## Migration Status

- [x] Phase 1: Foundation (core, deps, exceptions)
- [x] Phase 2: Repository layer
- [x] Phase 3: Service layer
- [x] Phase 4: Route handlers + main.py refactor
- [x] Phase 5: Cleanup legacy src/ (deleted; src/db graduated to db/)

## Running the Server

```bash
cd backend
source venv/bin/activate
python main.py
```

## Environment Variables

See `.env.example` for required variables. The new `core/config.py` uses Pydantic Settings with `.env` file support.