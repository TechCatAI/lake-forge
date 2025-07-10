export interface APIError {
  detail: string | Array<{ loc: string[]; msg: string }>
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
  group_id: number | null
  load_type: 'full' | 'incremental'
  pk_columns: string[]
  ingest_options: Record<string, unknown>
  quarantine: boolean
  updated_at: string | null
}

export type TableInput = Omit<TableConfig, 'id' | 'updated_at'>

export async function fetchTables(): Promise<TableConfig[]> {
  const res = await fetch('/api/tables')
  if (!res.ok) {
    throw (await res.json()) as APIError
  }
  return res.json()
}

export interface DQRule {
  id: number
  table_config_id: number
  rule_name: string
  rule_sql: string
  severity: 'warn' | 'fail' | 'drop'
  is_enabled: boolean
  updated_at: string | null
  fqtn: string
}

export type DQRuleInput = Omit<DQRule, 'id' | 'updated_at' | 'fqtn'>

export async function fetchRules(): Promise<DQRule[]> {
  const res = await fetch('/api/rules')
  if (!res.ok) {
    throw (await res.json()) as APIError
  }
  return res.json()
}

export async function updateRule(
  id: number,
  payload: Partial<DQRuleInput>,
): Promise<DQRule> {
  const res = await fetch(`/api/rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw (await res.json()) as APIError
  }
  return res.json()
}

export async function createRule(payload: DQRuleInput): Promise<DQRule> {
  const res = await fetch('/api/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
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

export async function deleteTable(id: number): Promise<void> {
  const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw (await res.json()) as APIError
  }
}

export async function deleteRule(id: number): Promise<void> {
  const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw (await res.json()) as APIError
  }
}

export interface Group {
  id: number
  name: string
  description: string | null
  is_enabled: boolean
  updated_at: string | null
}

export type GroupInput = Omit<Group, 'id' | 'updated_at'>

export async function fetchGroups(): Promise<Group[]> {
  const res = await fetch('/api/groups')
  if (!res.ok) throw (await res.json()) as APIError
  return res.json()
}

export async function createGroup(payload: GroupInput): Promise<Group> {
  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw (await res.json()) as APIError
  return res.json()
}

export async function updateGroup(
  id: number,
  delta: Partial<GroupInput>,
): Promise<Group> {
  const res = await fetch(`/api/groups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(delta),
  })
  if (!res.ok) throw (await res.json()) as APIError
  return res.json()
}

export async function deleteGroup(id: number): Promise<void> {
  const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' })
  if (!res.ok) throw (await res.json()) as APIError
}

export interface Schedule {
  id: number
  name: string
  description: string | null
  days: number[]
  times: string[]
  is_enabled: boolean
  updated_at: string | null
}

export type ScheduleInput = Omit<Schedule, 'id' | 'updated_at'>

export async function fetchSchedules(): Promise<Schedule[]> {
  const res = await fetch('/api/schedules')
  if (!res.ok) throw (await res.json()) as APIError
  return res.json()
}

export async function createSchedule(payload: ScheduleInput): Promise<Schedule> {
  const res = await fetch('/api/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw (await res.json()) as APIError
  return res.json()
}

export async function updateSchedule(
  id: number,
  delta: Partial<ScheduleInput>,
): Promise<Schedule> {
  const res = await fetch(`/api/schedules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(delta),
  })
  if (!res.ok) throw (await res.json()) as APIError
  return res.json()
}

export async function deleteSchedule(id: number): Promise<void> {
  const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
  if (!res.ok) throw (await res.json()) as APIError
}
