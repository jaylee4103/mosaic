/**
 * Browser automation using Playwright.
 * Launches a headless Chromium instance, navigates to URLs,
 * and returns page content as text for the LLM to reason about.
 */
import { chromium, type Browser, type Page } from 'playwright'

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  }
  return browserInstance
}

export async function browseWebpage(url: string): Promise<{
  title: string
  content: string
  success: boolean
  error?: string
}> {
  const startTime = Date.now()
  console.log(`[browser] Navigating to ${url}`)

  try {
    const browser = await getBrowser()
    const page = await browser.newPage()

    // Set a reasonable timeout and user agent
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })

    // Wait a moment for dynamic content
    await page.waitForTimeout(1000)

    const title = await page.title()
    const content = await page.textContent('body')

    // Get the visible text content, trimmed
    const trimmedContent = content?.replace(/\s+/g, ' ').trim() ?? ''

    // Limit content to avoid overwhelming the LLM context
    const maxContentLength = 5000
    const truncatedContent = trimmedContent.length > maxContentLength
      ? trimmedContent.slice(0, maxContentLength) + '... [truncated]'
      : trimmedContent

    await page.close()

    console.log(`[browser] Successfully browsed ${url} (${Date.now() - startTime}ms, ${truncatedContent.length} chars)`)

    return {
      title,
      content: truncatedContent,
      success: true,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[browser] Failed to browse ${url}:`, errorMessage)
    return {
      title: '',
      content: '',
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Get a summary of a webpage — title, key text, and any relevant product info.
 * Useful for agents that need a quick overview without the full text.
 */
export async function getPageSummary(url: string): Promise<{
  title: string
  summary: string
  price?: string
  success: boolean
}> {
  const result = await browseWebpage(url)
  if (!result.success) {
    return { title: '', summary: '', success: false }
  }

  const content = result.content

  // Try to extract price from page text
  const priceMatch = content.match(/\$?\d+\.?\d*\s?(?:USD|\$)/i)
  const price = priceMatch ? priceMatch[0] : undefined

  // Take first 500 chars as summary
  const summary = content.slice(0, 500).replace(/\s+/g, ' ').trim()

  return {
    title: result.title,
    summary,
    price,
    success: true,
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
    console.log('[browser] Browser closed')
  }
}
