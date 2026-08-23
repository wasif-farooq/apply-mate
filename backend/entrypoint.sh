#!/usr/bin/env sh
set -e

# Apply schema migrations before the app accepts traffic. This runs per
# container, so with more than one replica two containers can race here.
# Alembic's version table makes the loser a no-op in practice, but if this
# service is ever scaled past one instance, move this to a release/pre-deploy
# step and drop it from the entrypoint.
echo "[entrypoint] alembic upgrade head"
alembic upgrade head

echo "[entrypoint] starting uvicorn on port ${PORT:-8000}"
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
