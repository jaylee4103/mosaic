import { expect, test } from 'bun:test'
import { analyzeBoard, analyzeBoardMock } from '../lib/server/board-analysis'
import { addImage } from '../lib/server/board-images'
import { createFakeSupabase } from './support/fake-supabase'

const GUEST_ID = 'guest-1'
const BOARD_ID = 'board-1'
const VIBE = {
  phrase: 'Sun-Washed Mediterranean',
  facets: { color: ['amber', 'cream'], material: ['wood'] },
  mixed: false,
  target_domain: null,
  message: null,
}

function ownedBoard() {
  return createFakeSupabase({ boards: [{ id: BOARD_ID, guest_session_id: GUEST_ID, name: 'Board' }] })
}

test('analysis sends stored private images to ML and saves its vibe result', async () => {
  const { client, tables } = ownedBoard()
  await addImage(GUEST_ID, BOARD_ID, { mimeType: 'image/png', bytes: new Uint8Array([1, 2, 3]), note: 'I like the colors' }, client)
  let called = false
  const fetcher = async (url: string, options: RequestInit) => {
    called = true
    expect(String(url)).toBe('http://ml.local/api/vibe/analyze')
    expect(options?.method).toBe('POST')
    const form = options?.body as FormData
    expect(form.get('mode')).toBeNull()
    const image = form.get('files') as File
    expect(image.type).toBe('image/png')
    expect([...new Uint8Array(await image.arrayBuffer())]).toEqual([1, 2, 3])
    return Response.json({ vibe: VIBE })
  }

  const profile = await analyzeBoard(GUEST_ID, BOARD_ID, client, fetcher, 'http://ml.local')
  expect(called).toBe(true)
  expect(profile.name).toBe(VIBE.phrase)
  expect(profile.profile).toEqual(VIBE)
  expect(tables.vibe_profiles).toHaveLength(1)
})

test('analysis forwards the configured service token only in the request header', async () => {
  const previousToken = process.env.ML_SERVICE_TOKEN
  process.env.ML_SERVICE_TOKEN = 'test-service-token'
  try {
    const { client } = ownedBoard()
    await addImage(GUEST_ID, BOARD_ID, { mimeType: 'image/png', bytes: new Uint8Array([1]) }, client)
    const fetcher = async (_url: string, options: RequestInit) => {
      expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-service-token')
      return Response.json({ vibe: VIBE })
    }
    await analyzeBoard(GUEST_ID, BOARD_ID, client, fetcher, 'http://ml.local')
  } finally {
    if (previousToken === undefined) delete process.env.ML_SERVICE_TOKEN
    else process.env.ML_SERVICE_TOKEN = previousToken
  }
})

test('analysis rejects missing images and other guests before calling ML', async () => {
  const { client } = ownedBoard()
  const unused = async () => { throw new Error('ML must not be called') }
  await expect(analyzeBoard(GUEST_ID, BOARD_ID, client, unused, 'http://ml.local')).rejects.toMatchObject({ code: 'VALIDATION' })
  await expect(analyzeBoard('other-guest', BOARD_ID, client, unused, 'http://ml.local')).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('analysis does not save an invalid ML response', async () => {
  const { client, tables } = ownedBoard()
  await addImage(GUEST_ID, BOARD_ID, { mimeType: 'image/jpeg', bytes: new Uint8Array([8]) }, client)
  const fetcher = async () => Response.json({ vibe: { phrase: 'No facets' } })
  await expect(analyzeBoard(GUEST_ID, BOARD_ID, client, fetcher, 'http://ml.local')).rejects.toMatchObject({ code: 'ML_UNAVAILABLE' })
  expect(tables.vibe_profiles).toHaveLength(0)
})

test('analysis refuses to save a vibe after the board images change', async () => {
  const { client, tables } = ownedBoard()
  await addImage(GUEST_ID, BOARD_ID, { mimeType: 'image/webp', bytes: new Uint8Array([4]) }, client)
  const fetcher = async () => {
    await addImage(GUEST_ID, BOARD_ID, { mimeType: 'image/webp', bytes: new Uint8Array([5]) }, client)
    return Response.json({ vibe: VIBE })
  }
  await expect(analyzeBoard(GUEST_ID, BOARD_ID, client, fetcher, 'http://ml.local')).rejects.toMatchObject({ code: 'BOARD_CHANGED' })
  expect(tables.vibe_profiles).toHaveLength(0)
})

test('mock analysis saves an ML sample profile without board images', async () => {
  const { client, tables } = ownedBoard()
  const fetcher = async (url: string, options: RequestInit) => {
    expect(url).toBe('http://ml.local/api/vibe/mock/analyze?scenario=mediterranean')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    return Response.json({ vibe: VIBE })
  }

  const profile = await analyzeBoardMock(GUEST_ID, BOARD_ID, 'mediterranean', client, fetcher, 'http://ml.local')
  expect(profile.profile).toEqual(VIBE)
  expect(tables.vibe_profiles).toHaveLength(1)
})

test('mock analysis rejects invalid scenarios and other guests before calling ML', async () => {
  const { client } = ownedBoard()
  const unused = async () => { throw new Error('ML must not be called') }
  await expect(analyzeBoardMock(GUEST_ID, BOARD_ID, 'unknown', client, unused, 'http://ml.local')).rejects.toMatchObject({ code: 'VALIDATION' })
  await expect(analyzeBoardMock('other-guest', BOARD_ID, 'alpine', client, unused, 'http://ml.local')).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('mock analysis does not save an invalid ML response', async () => {
  const { client, tables } = ownedBoard()
  const fetcher = async () => Response.json({ vibe: { phrase: 'No facets' } })
  await expect(analyzeBoardMock(GUEST_ID, BOARD_ID, 'alpine', client, fetcher, 'http://ml.local')).rejects.toMatchObject({ code: 'ML_UNAVAILABLE' })
  expect(tables.vibe_profiles).toHaveLength(0)
})
