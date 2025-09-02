#!/usr/bin/env bash
set -e
export PYTHONUNBUFFERED=1
if [ -f backend/.env ]; then
  export $(grep -v '^#' backend/.env | xargs)
fi
python -m uvicorn backend.app:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000} --forwarded-allow-ips='*'
