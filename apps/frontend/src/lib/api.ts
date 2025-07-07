export interface APIError {
  detail: string
}

export interface TableConfig {
  id: number
  source_kind: string
  source_system: string
  catalog: string
  schema_name: string
  table_name: string
  is_enabled: boolean
  source_path: string
  file_format: string | null
  connection_id: number | null
  load_type: 'full' | 'incremental'
  pk_columns: string[]
  ingest_options: Record<string, unknown>
  updated_at?: string
}

export type TableInput = Omit<TableConfig, 'id' | 'updated_at'>

export async function fetchTables(): Promise<TableConfig[]> {
  const res = await fetch('/api/tables')
  if (!res.ok) {
    throw (await res.json()) as APIError
  }
  return res.json()
}

export async function updateTable(
  id: number,
  payload: Partial<TableInput>,
): Promise<TableConfig> {
  const res = await fetch(`/api/tables/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw (await res.json()) as APIError
  }
  return res.json()
}

export async function createTable(payload: TableInput): Promise<TableConfig> {
  const res = await fetch('/api/tables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw (await res.json()) as APIError
  }
  return res.json()
}
