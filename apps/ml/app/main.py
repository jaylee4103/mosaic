"""FastAPI entrypoint for the Mosaic Vibe Detection ML Service."""

import logging
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.routes import mock, vibe

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

app = FastAPI(
    title="Mosaic Vibe Detection",
    description="AI-powered vibe extraction from image sets",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vibe.router, prefix="/api/vibe", tags=["vibe"])
app.include_router(mock.router, prefix="/api/vibe/mock", tags=["mock"])

# Serve the test frontend
static_dir = Path(__file__).parent.parent / "static"


@app.get("/")
async def serve_frontend() -> FileResponse:
    return FileResponse(static_dir / "index.html")

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/models")
async def list_models() -> dict:
    """Return available models (OpenRouter-compatible endpoint)."""
    return {
        "object": "list",
        "data": [
            {
                "id": "typesafe/jev-router",
                "object": "model",
                "created": 1700000000,
                "owned_by": "typesafe",
            }
        ],
    }
