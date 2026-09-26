import { expect, test } from 'bun:test'
import { createBoard } from '../lib/server/boards'
import { getVibeProfile, saveVibeProfile } from '../lib/server/vibe-profile'
import { createFakeSupabase } from './support/fake-supabase'

const GUEST_ID = 'guest-1'
const OTHER_GUEST_ID = 'guest-2'

// Shape mirrors apps/ml's VibeResult (apps/ml/app/models/vibe.py) verbatim —
// Backend stores it as-is and must not reshape or rename its fields.
const AI_RESULT = {
  phrase: 'Sun-Washed Mediterranean',
  facets: {
    style_archetype: 'coastal',
    material: 'linen',
    color_tone: 'warm',
    era_mood: 'timeless',
    color_palette: 'warm earth tones',
    texture_quality: 'natural',
    light_quality: 'golden',
    energy_mood: 'calm',
    density_complexity: 'balanced',
    confidence: { style_archetype: 0.82, material: 0.71 },
  },
  confidence: 0.83,
  mixed: false,
  target_domain: null,
  message: null,
}

test('saveVibeProfile stores the AI result as-is and getVibeProfile round-trips it', async () => {
  const { client } = createFakeSupabase()
  const board = await createBoard(GUEST_ID, 'Summer in Italy', client)

  const saved = await saveVibeProfile(GUEST_ID, board.id, AI_RESULT, client)
  expect(saved.name).toBe('Sun-Washed Mediterranean')
  expect(saved.description).toBeNull()
  expect(saved.profile).toEqual(AI_RESULT)

  const fetched = await getVibeProfile(GUEST_ID, board.id, client)
  expect(fetched.profile).toEqual(AI_RESULT)
})

test('saveVibeProfile upserts, overwriting the previous result on re-save', async () => {
  const { client, tables } = createFakeSupabase()
  const board = await createBoard(GUEST_ID, 'Dream Apartment', client)

  await saveVibeProfile(GUEST_ID, board.id, AI_RESULT, client)
  const secondResult = { ...AI_RESULT, phrase: 'Moody Industrial Loft', mixed: true }
  await saveVibeProfile(GUEST_ID, board.id, secondResult, client)

  expect(tables.vibe_profiles).toHaveLength(1)
  const fetched = await getVibeProfile(GUEST_ID, board.id, client)
  expect(fetched.name).toBe('Moody Industrial Loft')
  expect(fetched.profile.mixed).toBe(true)
})

test('a low-confidence AI result with an empty phrase and a message is still saved', async () => {
  const { client } = createFakeSupabase()
  const board = await createBoard(GUEST_ID, 'Vague Board', client)
  const lowConfidence = {
    phrase: '',
    facets: {},
    confidence: 0.1,
    mixed: false,
    target_domain: null,
    message: 'Low confidence — try uploading more cohesive images.',
  }

  const saved = await saveVibeProfile(GUEST_ID, board.id, lowConfidence, client)
  expect(saved.name).toBe('')
  expect(saved.description).toBe('Low confidence — try uploading more cohesive images.')
})

test('saveVibeProfile rejects a non-object body', async () => {
  const { client } = createFakeSupabase()
  const board = await createBoard(GUEST_ID, 'Board', client)
  await expect(saveVibeProfile(GUEST_ID, board.id, 'not an object', client)).rejects.toMatchObject({
    code: 'VALIDATION',
  })
  await expect(saveVibeProfile(GUEST_ID, board.id, null, client)).rejects.toMatchObject({ code: 'VALIDATION' })
})

test('vibe profile access 404s for a board owned by another guest or a missing profile', async () => {
  const { client } = createFakeSupabase()
  const board = await createBoard(GUEST_ID, 'Board', client)

  await expect(getVibeProfile(GUEST_ID, board.id, client)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  await expect(saveVibeProfile(OTHER_GUEST_ID, board.id, AI_RESULT, client)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })

  await saveVibeProfile(GUEST_ID, board.id, AI_RESULT, client)
  await expect(getVibeProfile(OTHER_GUEST_ID, board.id, client)).rejects.toMatchObject({ code: 'NOT_FOUND' })
})
