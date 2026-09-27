"""Browser automation routes — wraps Playwright for service-to-service browsing.

The Next.js web app calls these endpoints instead of launching Playwright
directly, keeping browser binaries isolated in the ML service.
"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.browser_service import browse, browse_summary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["browser"])


class BrowseRequest(BaseModel):
    url: str


class BrowseResponse(BaseModel):
    title: str
    content: str
    success: bool
    error: str | None = None


class SummaryResponse(BaseModel):
    title: str
    summary: str
    price: str | None = None
    success: bool
    error: str | None = None


@router.post("/browse", response_model=BrowseResponse)
async def browse_webpage(request: BrowseRequest):
    """Navigate to a URL and return the page title and text content."""
    logger.info("Browsing %s", request.url)
    result = await browse(request.url)
    return BrowseResponse(**result)


@router.post("/browse/summary", response_model=SummaryResponse)
async def browse_summary(request: BrowseRequest):
    """Get a quick summary of a page — title, excerpt, and any visible price."""
    logger.info("Summarizing %s", request.url)
    result = await browse_summary(request.url)
    return SummaryResponse(**result)
