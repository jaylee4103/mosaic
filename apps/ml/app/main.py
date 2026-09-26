"""FastAPI entrypoint for the Mosaic Vibe Detection ML Service."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routes import vibe

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

# Serve the test frontend
static_dir = Path(__file__).parent.parent / "static"


@app.get("/")
async def serve_frontend() -> FileResponse:
    return FileResponse(static_dir / "index.html")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
