import { afterEach, expect, test } from 'bun:test'
import { analyzeBoard, createBoard, getBoards } from '../lib/boards/store'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('board UI creates a saved board, uploads images, and reads the real vibe profile', async () => {
  const calls: string[] = []
  let analyzed = false
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    calls.push(`${init?.method ?? 'GET'} ${path}`)

    if (path === '/api/boards' && init?.method === 'POST') {
      return Response.json({ id: 'board-1', name: 'Warm room', createdAt: '2026-09-26T00:00:00Z' }, { status: 201 })
    }
    if (path === '/api/boards/board-1/images' && init?.method === 'POST') {
      expect(init.body).toBeInstanceOf(FormData)
      expect((init.body as FormData).get('image')).toBeInstanceOf(File)
      return Response.json({ id: 'image-1' }, { status: 201 })
    }
    if (path === '/api/boards/board-1/analyze' && init?.method === 'POST') {
      analyzed = true
      return Response.json({ vibeProfile: { name: 'Cozy room' } })
    }
    if (path === '/api/boards') {
      return Response.json({ boards: [{ id: 'board-1', name: 'Warm room', createdAt: '2026-09-26T00:00:00Z' }] })
    }
    if (path === '/api/boards/board-1') {
      return Response.json({
        id: 'board-1', name: 'Warm room', createdAt: '2026-09-26T00:00:00Z',
        images: [{ id: 'image-1', url: 'https://storage.example/image', note: null, createdAt: '2026-09-26T00:00:00Z' }],
        vibeProfile: analyzed ? {
          name: 'Cozy room', description: 'Warm natural textures',
          profile: { facets: { color_palette: 'warm earth tones', material: 'wood', energy_mood: 'cozy' } },
        } : null,
      })
    }
    throw new Error(`Unexpected request: ${path}`)
  }) as typeof fetch

  const board = await createBoard({
    name: 'Warm room',
    images: [{ file: new File(['image'], 'inspiration.png', { type: 'image/png' }) }],
  })
  expect(board.images[0]?.image_url).toBe('https://storage.example/image')
  expect(board.vibe).toBeNull()

  await analyzeBoard(board.id)
  const [refreshed] = await getBoards()
  expect(refreshed.vibe?.name).toBe('Cozy room')
  expect(refreshed.vibe?.colors).toEqual(['warm earth tones'])
  expect(refreshed.vibe?.materials).toEqual(['wood'])
  expect(calls).toEqual([
    'POST /api/boards',
    'POST /api/boards/board-1/images',
    'GET /api/boards/board-1',
    'POST /api/boards/board-1/analyze',
    'GET /api/boards',
    'GET /api/boards/board-1',
  ])
})
