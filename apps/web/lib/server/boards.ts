import type { SupabaseClient } from '@supabase/supabase-js'
import { listBoardImageRecords, removeBoardImageStorage, signImages, type BoardImage } from './board-images'
import { notFoundError, validationError } from './errors'
import { getSupabaseAdmin } from './supabase'

export type Board = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type VibeProfile = {
  name: string
  description: string | null
  profile: Record<string, unknown>
  updatedAt: string
}

export type BoardDetail = Board & {
  images: BoardImage[]
  vibeProfile: VibeProfile | null
}

type BoardRow = { id: string; name: string; created_at: string; updated_at: string }

function mapBoard(row: BoardRow): Board {
  return { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at }
}

function assertValidName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || name.trim().length < 1 || name.length > 120) {
    throw validationError('Board name must be between 1 and 120 characters')
  }
}

async function findOwnedBoardRow(guestId: string, boardId: string, db: SupabaseClient): Promise<BoardRow> {
  const { data, error } = await db
    .from('boards')
    .select('id, name, created_at, updated_at')
    .eq('id', boardId)
    .eq('guest_session_id', guestId)
    .maybeSingle()
  if (error) throw new Error('Could not look up board')
  if (!data) throw notFoundError('Board not found')
  return data
}

export async function listBoards(guestId: string, db: SupabaseClient = getSupabaseAdmin()): Promise<Board[]> {
  const { data, error } = await db
    .from('boards')
    .select('id, name, created_at, updated_at')
    .eq('guest_session_id', guestId)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Could not list boards')
  return (data ?? []).map(mapBoard)
}

export async function createBoard(
  guestId: string,
  name: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Board> {
  assertValidName(name)
  const { data, error } = await db
    .from('boards')
    .insert({ guest_session_id: guestId, name: name.trim() })
    .select('id, name, created_at, updated_at')
    .single()
  if (error || !data) throw new Error('Could not create board')
  return mapBoard(data)
}

export async function getBoard(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<BoardDetail> {
  const row = await findOwnedBoardRow(guestId, boardId, db)
  const [imageRecords, vibeRow] = await Promise.all([
    listBoardImageRecords(boardId, db),
    db.from('vibe_profiles').select('name, description, profile_json, updated_at').eq('board_id', boardId).maybeSingle(),
  ])
  if (vibeRow.error) throw new Error('Could not load vibe profile')

  const images = await signImages(imageRecords, db)
  const vibeProfile: VibeProfile | null = vibeRow.data
    ? {
        name: vibeRow.data.name,
        description: vibeRow.data.description,
        profile: vibeRow.data.profile_json,
        updatedAt: vibeRow.data.updated_at,
      }
    : null

  return { ...mapBoard(row), images, vibeProfile }
}

export async function updateBoard(
  guestId: string,
  boardId: string,
  input: { name: string },
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<Board> {
  assertValidName(input.name)
  const { data, error } = await db
    .from('boards')
    .update({ name: input.name.trim(), updated_at: new Date().toISOString() })
    .eq('id', boardId)
    .eq('guest_session_id', guestId)
    .select('id, name, created_at, updated_at')
    .maybeSingle()
  if (error) throw new Error('Could not update board')
  if (!data) throw notFoundError('Board not found')
  return mapBoard(data)
}

export async function deleteBoard(
  guestId: string,
  boardId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<void> {
  await findOwnedBoardRow(guestId, boardId, db)
  await removeBoardImageStorage(boardId, db)
  const { error } = await db.from('boards').delete().eq('id', boardId).eq('guest_session_id', guestId)
  if (error) throw new Error('Could not delete board')
}
