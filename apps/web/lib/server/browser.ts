/**
 * Browser automation client.
 * Calls the ML service (Playwright) via HTTP to navigate to URLs
 * and return page content. The browser runs in the ML service,
 * not in the Next.js app.
 */
import { mlServiceHeaders } from './ml-service'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8000"

export async function browseWebpage(url: string): Promise<{
  title: string
  content: string
  success: boolean
  error?: string
}> {
  console.log(`[browser] Requesting browse for ${url} via ${ML_SERVICE_URL}`)

  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/browse`, {
      method: "POST",
      headers: mlServiceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`)
    }

    const data = await response.json()
    console.log(`[browser] Got response: title="${data.title}", success=${data.success}`)
    return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[browser] Failed to browse ${url}:`, errorMessage)
    return { title: "", content: "", success: false, error: errorMessage }
  }
}

export async function getPageSummary(url: string): Promise<{
  title: string
  summary: string
  price?: string
  success: boolean
}> {
  console.log(`[browser] Requesting summary for ${url} via ${ML_SERVICE_URL}`)

  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/browse/summary`, {
      method: "POST",
      headers: mlServiceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`)
    }

    const data = await response.json()
    console.log(`[browser] Got summary: title="${data.title}", success=${data.success}`)
    return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[browser] Failed to summarize ${url}:`, errorMessage)
    return { title: "", summary: "", success: false }
  }
}
