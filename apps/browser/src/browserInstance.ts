import { chromium, type Browser } from 'playwright'

let browserInstance: Browser | null = null

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    console.log('[browser-instance] launching chromium')
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  }
  return browserInstance
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('[browser-instance] closing chromium')
    await browserInstance.close()
    browserInstance = null
  }
}
