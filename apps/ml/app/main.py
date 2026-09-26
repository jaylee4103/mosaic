"""FastAPI entrypoint for the Mosaic Vibe Detection ML Service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
