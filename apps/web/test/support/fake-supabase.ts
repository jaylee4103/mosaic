import type { SupabaseClient } from '@supabase/supabase-js'

export type FakeRow = Record<string, unknown>
type QueryResult = { data: unknown; error: { message: string } | null; count?: number }

function matches(row: FakeRow, filters: Array<[string, unknown]>): boolean {
  return filters.every(([key, value]) => row[key] === value)
}

class FakeQueryBuilder implements PromiseLike<QueryResult> {
  private filters: Array<[string, unknown]> = []
  private orderBy: { column: string; ascending: boolean } | undefined
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: FakeRow | undefined
  private countOnly = false

  constructor(private table: FakeRow[]) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }): this {
    if (options?.head) this.countOnly = true
    return this
  }

  eq(column: string, value: unknown): this {
    this.filters.push([column, value])
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  insert(row: FakeRow): this {
    this.mode = 'insert'
    this.payload = row
    return this
  }

  update(patch: FakeRow): this {
    this.mode = 'update'
    this.payload = patch
    return this
  }

  delete(): this {
    this.mode = 'delete'
    return this
  }

  private matchedRows(): FakeRow[] {
    return this.table.filter((row) => matches(row, this.filters))
  }

  private resolve(): QueryResult {
    const now = new Date().toISOString()
    if (this.mode === 'insert') {
      const row: FakeRow = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...this.payload }
      this.table.push(row)
      return { data: row, error: null }
    }
    if (this.mode === 'update') {
      const rows = this.matchedRows()
      for (const row of rows) Object.assign(row, this.payload)
      return { data: rows[0] ?? null, error: null }
    }
    if (this.mode === 'delete') {
      const rows = this.matchedRows()
      for (const row of rows) {
        const index = this.table.indexOf(row)
        if (index >= 0) this.table.splice(index, 1)
      }
      return { data: rows, error: null }
    }
    let rows = this.matchedRows()
    if (this.orderBy) {
      const { column, ascending } = this.orderBy
      rows = [...rows].sort((a, b) => {
        const left = a[column] as string | number
        const right = b[column] as string | number
        const direction = left > right ? 1 : left < right ? -1 : 0
        return ascending ? direction : -direction
      })
    }
    if (this.countOnly) return { data: null, error: null, count: rows.length }
    return { data: rows, error: null }
  }

  async maybeSingle(): Promise<{ data: FakeRow | null; error: { message: string } | null }> {
    const { data, error } = this.resolve()
    const rows = Array.isArray(data) ? data : data ? [data as FakeRow] : []
    return { data: (rows[0] as FakeRow) ?? null, error }
  }

  async single(): Promise<{ data: FakeRow | null; error: { message: string } | null }> {
    const { data, error } = this.resolve()
    const rows = Array.isArray(data) ? data : data ? [data as FakeRow] : []
    if (!rows[0]) return { data: null, error: error ?? { message: 'No rows found' } }
    return { data: rows[0] as FakeRow, error: null }
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onFulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolve()).then(onFulfilled, onRejected)
  }
}

function createFakeStorage(objects: Map<string, Uint8Array>) {
  return {
    from(bucket: string) {
      return {
        async upload(path: string, bytes: Uint8Array) {
          if (objects.has(path)) return { data: null, error: { message: 'Duplicate' } }
          objects.set(path, bytes)
          return { data: { id: path, path, fullPath: `${bucket}/${path}` }, error: null }
        },
        async remove(paths: string[]) {
          for (const path of paths) objects.delete(path)
          return { data: paths.map((path) => ({ name: path })), error: null }
        },
        async createSignedUrls(paths: string[], expiresIn: number) {
          return {
            data: paths.map((path) => ({
              path,
              error: null,
              signedURL: `/object/sign/${bucket}/${path}?token=fake&expiresIn=${expiresIn}`,
              signedUrl: `https://fake.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=fake`,
            })),
            error: null,
          }
        },
      }
    },
  }
}

export function createFakeSupabase(seed: Record<string, FakeRow[]> = {}) {
  const tables: Record<string, FakeRow[]> = {
    boards: seed.boards ?? [],
    board_images: seed.board_images ?? [],
    vibe_profiles: seed.vibe_profiles ?? [],
  }
  const objects = new Map<string, Uint8Array>()

  const client = {
    from(table: string) {
      tables[table] ??= []
      return new FakeQueryBuilder(tables[table])
    },
    storage: createFakeStorage(objects),
  }

  return { client: client as unknown as SupabaseClient, tables, objects }
}
