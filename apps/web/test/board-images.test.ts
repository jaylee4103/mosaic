import { expect, test } from 'bun:test'
import { addImage, deleteImage, IMAGE_BUCKET, signImages, updateImage } from '../lib/server/board-images'
import { createFakeSupabase } from './support/fake-supabase'

const GUEST_ID = 'guest-1'
const BOARD_ID = 'board-1'

function seedOwnedBoard() {
  return createFakeSupabase({ boards: [{ id: BOARD_ID, guest_session_id: GUEST_ID, name: 'Board' }] })
}

test('addImage uploads to a guest-scoped path and returns a signed url', async () => {
  const { client, objects } = seedOwnedBoard()
  const image = await addImage(
    GUEST_ID,
    BOARD_ID,
    { mimeType: 'image/png', bytes: new Uint8Array([1, 2, 3]), note: '  cozy corner  ' },
    client,
  )

  expect(image.note).toBe('cozy corner')
  expect(image.position).toBe(0)
  expect(image.url).toContain(IMAGE_BUCKET)
  const [storedPath] = [...objects.keys()]
  expect(storedPath).toBe(`${GUEST_ID}/${BOARD_ID}/${image.id}.png`)
})

test('addImage rejects disallowed mime types and oversized files', async () => {
  const { client } = seedOwnedBoard()
  await expect(
    addImage(GUEST_ID, BOARD_ID, { mimeType: 'image/gif', bytes: new Uint8Array([1]) }, client),
  ).rejects.toMatchObject({ code: 'VALIDATION' })

  const tooLarge = new Uint8Array(10 * 1024 * 1024 + 1)
  await expect(
    addImage(GUEST_ID, BOARD_ID, { mimeType: 'image/png', bytes: tooLarge }, client),
  ).rejects.toMatchObject({ code: 'VALIDATION' })
})

test('addImage returns NOT_FOUND for a board owned by another guest', async () => {
  const { client } = seedOwnedBoard()
  await expect(
    addImage('someone-else', BOARD_ID, { mimeType: 'image/png', bytes: new Uint8Array([1]) }, client),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('updateImage changes note and position, and 404s for an unknown image', async () => {
  const { client } = seedOwnedBoard()
  const image = await addImage(GUEST_ID, BOARD_ID, { mimeType: 'image/webp', bytes: new Uint8Array([1]) }, client)

  const updated = await updateImage(GUEST_ID, BOARD_ID, image.id, { note: 'updated', position: 3 }, client)
  expect(updated.note).toBe('updated')
  expect(updated.position).toBe(3)

  await expect(updateImage(GUEST_ID, BOARD_ID, 'missing-image', { note: 'x' }, client)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
})

test('deleteImage removes the storage object and the row', async () => {
  const { client, objects, tables } = seedOwnedBoard()
  const image = await addImage(GUEST_ID, BOARD_ID, { mimeType: 'image/jpeg', bytes: new Uint8Array([1]) }, client)
  expect(objects.size).toBe(1)

  await deleteImage(GUEST_ID, BOARD_ID, image.id, client)
  expect(objects.size).toBe(0)
  expect(tables.board_images).toHaveLength(0)
})

test('missing storage objects do not prevent a board from loading', async () => {
  const { client } = seedOwnedBoard()
  const records = [
    { id: 'good', storagePath: 'good.png', mimeType: 'image/png', note: null, position: 0, createdAt: '2026-09-27T00:00:00Z' },
    { id: 'missing', storagePath: 'missing.png', mimeType: 'image/png', note: null, position: 1, createdAt: '2026-09-27T00:00:00Z' },
  ]
  client.storage.from = (() => ({
    createSignedUrls: async () => ({ data: [
      { path: 'good.png', signedUrl: 'https://storage.example/good.png', error: null },
      { path: 'missing.png', signedUrl: null, error: 'Object not found' },
    ], error: null }),
  })) as unknown as typeof client.storage.from

  const images = await signImages(records, client)
  expect(images.map((image) => image.id)).toEqual(['good'])
})
