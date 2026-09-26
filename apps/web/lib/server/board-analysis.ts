import type { SupabaseClient } from '@supabase/supabase-js'
import { assertBoardOwnership } from './board-ownership'
import { IMAGE_BUCKET, listBoardImageRecords } from './board-images'
import { validationError } from './errors'
import { getSupabaseAdmin } from './supabase'
import { saveVibeProfile, type VibeProfile } from './vibe-profile'

const ANALYSIS_TIMEOUT_MS = 90_000
type AnalysisFetch = (url: string, options: RequestInit) => Promise<Response>

function serviceError(message: string): Error {
  return Object.assign(new Error(message), { code: 'ML_UNAVAILABLE' })
}

function analysisUrl(baseUrl: string | undefined): string {
  if (!baseUrl) throw serviceError('ML_SERVICE_URL is not configured')
  try {
    const base = new URL(baseUrl)
    if (base.protocol !== 'http:' && base.protocol !== 'https:') throw new Error('Unsupported protocol')
    return new URL('/api/vibe/analyze', base).toString()
  } catch {
    throw serviceError('ML_SERVICE_URL must be an HTTP or HTTPS origin')
  }
}

function isVibeResult(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  return typeof result.phrase === 'string' &&
    typeof result.facets === 'object' && result.facets !== null && !Array.isArray(result.facets) &&
    typeof result.confidence === 'number' && Number.isFinite(result.confidence) &&
    typeof result.mixed === 'boolean'
}

export async function analyzeBoard(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
  fetcher: AnalysisFetch = fetch,
  mlServiceUrl: string | undefined = process.env.ML_SERVICE_URL,
): Promise<VibeProfile> {
  await assertBoardOwnership(guestId, boardId, db)
  const images = await listBoardImageRecords(boardId, db)
  if (images.length === 0) throw validationError('Add at least one image before analyzing the board')
  const url = analysisUrl(mlServiceUrl)

  const form = new FormData()
  form.set('mode', 'intra')
  for (const image of images) {
    const { data, error } = await db.storage.from(IMAGE_BUCKET).download(image.storagePath)
    if (error || !data) throw new Error('Could not read a board image for analysis')
    form.append('files', new File([data], `${image.id}.${image.mimeType.split('/')[1]}`, { type: image.mimeType }))
  }

  let response: Response
  try {
    response = await fetcher(url, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch {
    throw serviceError('The vibe analysis service could not be reached')
  }
  if (!response.ok) throw serviceError('The vibe analysis service could not analyze this board')

  const result: unknown = await response.json().catch(() => null)
  if (typeof result !== 'object' || result === null || !('vibe' in result) || !isVibeResult(result.vibe)) {
    throw serviceError('The vibe analysis service returned an invalid result')
  }

  // Images can change while a slow model request is running. Never save a
  // result for a different set of inspiration images or notes.
  const currentImages = await listBoardImageRecords(boardId, db)
  if (JSON.stringify(currentImages) !== JSON.stringify(images)) {
    throw Object.assign(new Error('Board images changed during analysis; analyze again'), { code: 'BOARD_CHANGED' })
  }
  return saveVibeProfile(guestId, boardId, result.vibe, db)
}
