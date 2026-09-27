import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertBoardOwnership } from './board-ownership'
import { notFoundError, validationError } from './errors'
import { getSupabaseAdmin } from './supabase'

export const IMAGE_BUCKET = 'mosaic-board-images'
const SIGNED_URL_TTL_SECONDS = 60 * 60
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export type BoardImageRecord = {
  id: string
  storagePath: string
  mimeType: string
  note: string | null
  position: number
  createdAt: string
}

export type BoardImage = Omit<BoardImageRecord, 'storagePath'> & { url: string }

type ImageRow = {
  id: string
  storage_path: string
  mime_type: string
  note: string | null
  position: number
  created_at: string
}

function mapRow(row: ImageRow): BoardImageRecord {
  return {
    id: row.id,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    note: row.note,
    position: row.position,
    createdAt: row.created_at,
  }
}

export async function listBoardImageRecords(
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<BoardImageRecord[]> {
  const { data, error } = await db
    .from('board_images')
    .select('id, storage_path, mime_type, note, position, created_at')
    .eq('board_id', boardId)
    .order('position', { ascending: true })
  if (error) throw new Error('Could not list board images')
  return (data ?? []).map(mapRow)
}

export async function signImages(
  records: BoardImageRecord[],
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<BoardImage[]> {
  if (records.length === 0) return []
  const paths = records.map((record) => record.storagePath)
  const { data, error } = await db.storage.from(IMAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) throw new Error('Could not sign board image URLs')
  const urlByPath = new Map(data.map((entry) => [entry.path, entry.signedUrl]))
  return records.flatMap(({ storagePath, ...rest }) => {
    const url = urlByPath.get(storagePath)
    if (!url) {
      console.warn(`[board-images] skipping unavailable image ${rest.id}`)
      return []
    }
    return [{ ...rest, url }]
  })
}

export async function addImage(
  guestId: string,
  boardId: string,
  input: { mimeType: string; bytes: Uint8Array; note?: string | null },
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<BoardImage> {
  await assertBoardOwnership(guestId, boardId, db)

  const extension = EXTENSION_BY_MIME_TYPE[input.mimeType]
  if (!extension) throw validationError('Image must be JPEG, PNG, or WebP')
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw validationError('Image must be between 1 byte and 10 MB')
  }

  const { count, error: countError } = await db
    .from('board_images')
    .select('id', { count: 'exact', head: true })
    .eq('board_id', boardId)
  if (countError) throw new Error('Could not count board images')

  const imageId = randomUUID()
  const storagePath = `${guestId}/${boardId}/${imageId}.${extension}`
  const { error: uploadError } = await db.storage.from(IMAGE_BUCKET).upload(storagePath, input.bytes, {
    contentType: input.mimeType,
    upsert: false,
  })
  if (uploadError) throw new Error('Could not upload board image')

  const { data, error } = await db
    .from('board_images')
    .insert({
      id: imageId,
      board_id: boardId,
      storage_path: storagePath,
      mime_type: input.mimeType,
      note: input.note?.trim() || null,
      position: count ?? 0,
    })
    .select('id, storage_path, mime_type, note, position, created_at')
    .single()
  if (error || !data) {
    await db.storage.from(IMAGE_BUCKET).remove([storagePath])
    throw new Error('Could not save board image')
  }

  const [image] = await signImages([mapRow(data)], db)
  return image
}

export async function updateImage(
  guestId: string,
  boardId: string,
  imageId: string,
  input: { note?: string | null; position?: number },
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<BoardImage> {
  await assertBoardOwnership(guestId, boardId, db)

  const updates: Record<string, unknown> = {}
  if (input.note !== undefined) updates.note = input.note?.trim() || null
  if (input.position !== undefined) {
    if (!Number.isInteger(input.position) || input.position < 0) {
      throw validationError('Position must be a non-negative integer')
    }
    updates.position = input.position
  }
  if (Object.keys(updates).length === 0) throw validationError('No fields to update')

  const { data, error } = await db
    .from('board_images')
    .update(updates)
    .eq('id', imageId)
    .eq('board_id', boardId)
    .select('id, storage_path, mime_type, note, position, created_at')
    .maybeSingle()
  if (error) throw new Error('Could not update board image')
  if (!data) throw notFoundError('Board image not found')

  const [image] = await signImages([mapRow(data)], db)
  return image
}

export async function deleteImage(
  guestId: string,
  boardId: string,
  imageId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<void> {
  await assertBoardOwnership(guestId, boardId, db)

  const { data, error } = await db
    .from('board_images')
    .select('storage_path')
    .eq('id', imageId)
    .eq('board_id', boardId)
    .maybeSingle()
  if (error) throw new Error('Could not look up board image')
  if (!data) throw notFoundError('Board image not found')

  const { error: removeError } = await db.storage.from(IMAGE_BUCKET).remove([data.storage_path])
  if (removeError) throw new Error('Could not remove board image from storage')

  const { error: deleteError } = await db.from('board_images').delete().eq('id', imageId).eq('board_id', boardId)
  if (deleteError) throw new Error('Could not delete board image')
}

export async function removeBoardImageStorage(boardId: string, db: SupabaseClient = getSupabaseAdmin()): Promise<void> {
  const records = await listBoardImageRecords(boardId, db)
  if (records.length === 0) return
  const { error } = await db.storage.from(IMAGE_BUCKET).remove(records.map((record) => record.storagePath))
  if (error) throw new Error('Could not remove board images from storage')
}
