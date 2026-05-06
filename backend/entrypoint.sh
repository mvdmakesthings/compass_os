#!/bin/sh
set -e

echo "Waiting for database..."
python -m app.scripts.wait_for_db

echo "Running database migrations..."
python -m app.scripts.migrate upgrade head

echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 "$@"
