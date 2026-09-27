"""Playwright-based browser service for service-to-service browsing.

The Next.js web app calls /api/browse and /api/browse/summary endpoints
instead of launching Playwright directly, keeping browser binaries
isolated in the ML service.
"""

import asyncio
import logging
import re
import time
from contextlib import asynccontextmanager

from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

_browser_instance = None
_playwright_context = None


async def get_browser():
    """Get or create the singleton browser instance."""
    global _browser_instance, _playwright_context
    if _browser_instance is None or not _browser_instance.is_connected():
        logger.info("Launching Chromium browser")
        _playwright_context = await async_playwright().start()
        _browser_instance = await _playwright_context.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        )
    return _browser_instance


async def close_browser():
    """Close the browser and playwright context."""
    global _browser_instance, _playwright_context
    if _browser_instance:
        await _browser_instance.close()
        _browser_instance = None
    if _playwright_context:
        await _playwright_context.stop()
        _playwright_context = None
    logger.info("Browser closed")


async def browse(url: str) -> dict:
    """Navigate to a URL and return page title and text content."""
    start = time.time()
    try:
        browser = await get_browser()
        page = await browser.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(1000)

        title = await page.title()
        content = await page.text_content("body")

        trimmed = " ".join((content or "").replace("\n", " ").replace("\r", "").split())

        # Truncate to avoid overwhelming the LLM context
        max_len = 5000
        if len(trimmed) > max_len:
            trimmed = trimmed[:max_len] + "... [truncated]"

        await page.close()

        logger.info("Browsed %s in %.1fs (%d chars)", url, time.time() - start, len(trimmed))
        return {"title": title, "content": trimmed, "success": True, "error": None}
    except Exception as e:
        logger.error("Browse failed for %s: %s", url, e)
        return {"title": "", "content": "", "success": False, "error": str(e)}


async def browse_summary(url: str) -> dict:
    """Get a quick summary — title, excerpt, and any visible price."""
    result = await browse(url)
    if not result["success"]:
        return {"title": "", "summary": "", "price": None, "success": False, "error": result["error"]}

    content = result["content"]
    price_match = re.search(r"\$?\d+\.?\d*\s?(?:USD|\$)?", content)
    price = price_match.group(0) if price_match else None
    summary = content[:500]

    return {"title": result["title"], "summary": summary, "price": price, "success": True, "error": None}
