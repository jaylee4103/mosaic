import { expect, test } from 'bun:test'
import { addImage } from '../lib/server/board-images'
import { createBoard, deleteBoard, getBoard, listBoards, updateBoard } from '../lib/server/boards'
import { createFakeSupabase } from './support/fake-supabase'

const GUEST_ID = 'guest-1'
const OTHER_GUEST_ID = 'guest-2'

test('createBoard validates the name and scopes the row to the guest', async () => {
  const { client, tables } = createFakeSupabase()
  await expect(createBoard(GUEST_ID, '', client)).rejects.toMatchObject({ code: 'VALIDATION' })
  await expect(createBoard(GUEST_ID, 'x'.repeat(121), client)).rejects.toMatchObject({ code: 'VALIDATION' })

  const board = await createBoard(GUEST_ID, '  Dream Apartment  ', client)
  expect(board.name).toBe('Dream Apartment')
  expect(tables.boards).toHaveLength(1)
  expect(tables.boards[0].guest_session_id).toBe(GUEST_ID)
})

test('listBoards only returns boards for the requesting guest', async () => {
  const { client } = createFakeSupabase()
  await createBoard(GUEST_ID, 'Mine', client)
  await createBoard(OTHER_GUEST_ID, 'Not mine', client)

  const boards = await listBoards(GUEST_ID, client)
  expect(boards).toHaveLength(1)
  expect(boards[0].name).toBe('Mine')
})

test('getBoard embeds signed images and the vibe profile, and 404s for another guest', async () => {
  const { client } = createFakeSupabase()
  const board = await createBoard(GUEST_ID, 'Summer in Italy', client)
  await addImage(GUEST_ID, board.id, { mimeType: 'image/png', bytes: new Uint8Array([1]) }, client)
  await client.from('vibe_profiles').insert({
    board_id: board.id,
    name: 'Sun-Washed Mediterranean',
    description: 'Warm and relaxed',
    profile_json: { colors: ['cream', 'terracotta'] },
  })

  const detail = await getBoard(GUEST_ID, board.id, client)
  expect(detail.images).toHaveLength(1)
  expect(detail.images[0].url).toContain('http')
  expect(detail.vibeProfile?.name).toBe('Sun-Washed Mediterranean')
  expect(detail.vibeProfile?.profile).toEqual({ colors: ['cream', 'terracotta'] })

  await expect(getBoard(OTHER_GUEST_ID, board.id, client)).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('updateBoard renames an owned board and 404s otherwise', async () => {
  const { client } = createFakeSupabase()
  const board = await createBoard(GUEST_ID, 'Old name', client)

  const updated = await updateBoard(GUEST_ID, board.id, { name: 'New name' }, client)
  expect(updated.name).toBe('New name')

  await expect(updateBoard(OTHER_GUEST_ID, board.id, { name: 'Hijack' }, client)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
})

test('deleteBoard removes the board and cleans up its image storage objects', async () => {
  const { client, tables, objects } = createFakeSupabase()
  const board = await createBoard(GUEST_ID, 'Temporary', client)
  await addImage(GUEST_ID, board.id, { mimeType: 'image/png', bytes: new Uint8Array([1]) }, client)
  expect(objects.size).toBe(1)

  await deleteBoard(GUEST_ID, board.id, client)
  expect(objects.size).toBe(0)
  expect(tables.boards).toHaveLength(0)

  await expect(deleteBoard(GUEST_ID, board.id, client)).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('deleteBoard detaches carts and preserves checkout records', async () => {
  const { client, tables } = createFakeSupabase()
  const board = await createBoard(GUEST_ID, 'Temporary', client)
  const other = await createBoard(GUEST_ID, 'Keep', client)
  tables.carts.push(
    { id: 'cart-to-detach', board_id: board.id, guest_session_id: GUEST_ID },
    { id: 'other-cart', board_id: other.id, guest_session_id: GUEST_ID },
  )
  tables.checkout_sessions.push({ id: 'checkout-to-preserve', cart_id: 'cart-to-detach', guest_session_id: GUEST_ID })

  await deleteBoard(GUEST_ID, board.id, client)

  expect(tables.carts[0].board_id).toBeNull()
  expect(tables.carts[1].board_id).toBe(other.id)
  expect(tables.checkout_sessions).toHaveLength(1)
  expect(tables.boards.map((row) => row.id)).toEqual([other.id])
})
