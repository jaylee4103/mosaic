import type { SupabaseClient } from '@supabase/supabase-js'
import { assertBoardOwnership } from './board-ownership'
import { notFoundError, validationError } from './errors'
import { getSupabaseAdmin } from './supabase'

// The shape stored in `profile` is whatever apps/ml's VibeResult produces
// (phrase, facets, confidence, mixed, target_domain, message) — see
// apps/ml/app/models/vibe.py. Backend does not reshape it; it only extracts
// `phrase`/`message` for the `name`/`description` columns already required
// by the vibe_profiles schema.
export type VibeProfile = {
  name: string
  description: string | null
  profile: Record<string, unknown>
  updatedAt: string
}

type VibeProfileRow = {
  name: string
  description: string | null
  profile_json: Record<string, unknown>
  updated_at: string
}

function mapRow(row: VibeProfileRow): VibeProfile {
  return { name: row.name, description: row.description, profile: row.profile_json, updatedAt: row.updated_at }
}

export async function findVibeProfile(
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<VibeProfile | null> {
  const { data, error } = await db
    .from('vibe_profiles')
    .select('name, description, profile_json, updated_at')
    .eq('board_id', boardId)
    .maybeSingle()
  if (error) throw new Error('Could not load vibe profile')
  return data ? mapRow(data) : null
}

export async function getVibeProfile(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<VibeProfile> {
  await assertBoardOwnership(guestId, boardId, db)
  const profile = await findVibeProfile(boardId, db)
  if (!profile) throw notFoundError('Vibe profile not found')
  return profile
}

export async function saveVibeProfile(
  guestId: string,
  boardId: string,
  body: unknown,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<VibeProfile> {
  await assertBoardOwnership(guestId, boardId, db)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validationError("Vibe profile body must be the AI service's vibe result object")
  }

  const result = body as Record<string, unknown>
  const phrase = typeof result.phrase === 'string' ? result.phrase : ''
  const message = typeof result.message === 'string' ? result.message : null

  const { data, error } = await db
    .from('vibe_profiles')
    .upsert(
      {
        board_id: boardId,
        name: phrase,
        description: message,
        profile_json: result,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'board_id' },
    )
    .select('name, description, profile_json, updated_at')
    .single()
  if (error || !data) throw new Error('Could not save vibe profile')
  return mapRow(data)
}
