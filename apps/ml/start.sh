#!/bin/bash
set -e

# Activate venv if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Create .env from example if missing
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo "Created .env from .env.example — add your OPENROUTER_API_KEY to enable the decision layer"
fi

echo "Starting Mosaic ML Service at http://localhost:8000"
echo "Frontend: http://localhost:8000/"
echo "API:     http://localhost:8000/api/vibe/analyze"
echo "Health:  http://localhost:8000/health"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
