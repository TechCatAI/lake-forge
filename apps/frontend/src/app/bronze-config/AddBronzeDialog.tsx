'use client'
import { useState, useEffect } from 'react'
import Button from '../../components/ui/button'
import Spinner from '../../components/Spinner'
import { toast } from 'sonner'
import {
  createBronzeConfig,
  createRawConfig,
  fetchRawConfigs,
  fetchGroups,
  type BronzeConfig,
  type RawConfig,
  type Group,
  type APIError,
} from '../../lib/api'

export interface AddPayload {
  raw_config_id: number | null
  source_kind: 'volume' | 'external' | 'jdbc'
  catalog: string
  schema_name: string
  table_name: string
  source_path: string
  file_format: 'parquet' | 'csv' | 'json' | 'avro'
  load_type: 'full' | 'incremental'
  pk_columns: string
  watermark_col: string
  ingest_options: string
  quarantine: boolean
  group_id: number | null
}

export default function AddBronzeDialog({ onCreate }: { onCreate(r: BronzeConfig): void }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'existing' | 'manual'>('existing')
  const [form, setForm] = useState<AddPayload>({
    raw_config_id: null,
    source_kind: 'volume',
    catalog: '',
    schema_name: '',
    table_name: '',
    source_path: '',
    file_format: 'parquet',
    load_type: 'full',
    pk_columns: '',
    watermark_col: '',
    ingest_options: '{}',
    quarantine: false,
    group_id: null,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [rawOptions, setRawOptions] = useState<RawConfig[]>([])
  const [groups, setGroups] = useState<Group[]>([])

  useEffect(() => {
    if (open) {
      fetchRawConfigs().then(setRawOptions, () => setRawOptions([]))
      fetchGroups()
        .then((gs) => setGroups(gs.filter((g) => g.is_bronze)))
        .catch(() => setGroups([]))
    }
  }, [open])

  const valid =
    (mode === 'manual' || form.raw_config_id !== null) &&
    form.catalog &&
    form.schema_name &&
    form.table_name &&
    form.source_path &&
    (form.load_type === 'incremental' ? form.pk_columns : true)

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setErrors({})
    try {
      const payload: any = {
        source_kind: form.source_kind,
        catalog: form.catalog,
        schema_name: form.schema_name,
        table_name: form.table_name,
        source_path: form.source_path,
        file_format: form.file_format,
        connection_id: null,
        load_type: form.load_type,
        pk_columns: form.pk_columns.split(/\s*,\s*/).filter(Boolean),
        watermark_col: form.watermark_col || null,
        ingest_options: JSON.parse(form.ingest_options || '{}'),
        quarantine: form.quarantine,
        is_enabled: false,
        group_id: form.group_id,
      }
      if (mode === 'manual') {
        const raw = await createRawConfig({
          group_id: form.group_id,
          source_kind: 'manual',
          source_system: 'manual',
          source_path: form.source_path,
          ingestion_type: 'manual',
          output_directory: form.source_path,
          connection_id: null,
          schedule_id: null,
          copy_options: {},
          is_enabled: false,
        })
        payload.raw_config_id = raw.id
      } else {
        payload.raw_config_id = form.raw_config_id
      }
      const row = await createBronzeConfig(payload)
      onCreate(row)
      toast.success('Bronze Config added')
      setForm({
        raw_config_id: null,
        source_kind: 'volume',
        catalog: '',
        schema_name: '',
        table_name: '',
        source_path: '',
        file_format: 'parquet',
        load_type: 'full',
        pk_columns: '',
        watermark_col: '',
        ingest_options: '{}',
        quarantine: false,
        group_id: null,
      })
      setMode('existing')
      setOpen(false)
    } catch (err) {
      const error = err as APIError & { detail?: unknown }
      if (Array.isArray(error.detail)) {
        const map: Record<string, string> = {}
        for (const d of error.detail as Array<{ loc: string[]; msg: string }>) {
          const field = d.loc[d.loc.length - 1]
          map[field] = d.msg
        }
        setErrors(map)
      }
      toast.error(typeof error.detail === 'string' ? error.detail : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Add Bronze</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-80" onSubmit={submit}>
            <h2 className="font-semibold">Add Bronze Config</h2>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="mode"
                  value="existing"
                  checked={mode === 'existing'}
                  onChange={() => setMode('existing')}
                />
                Use Raw Config
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="mode"
                  value="manual"
                  checked={mode === 'manual'}
                  onChange={() => setMode('manual')}
                />
                Manual: Data already landed in Raw
              </label>
            </div>
            {mode === 'existing' && (
              <select
                className={`border w-full px-1 ${errors.raw_config_id ? 'border-red-500' : ''}`}
                value={form.raw_config_id ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    raw_config_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">Select Raw Config</option>
                {rawOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.source_system} · {r.source_path}
                  </option>
                ))}
              </select>
            )}
            <select
              className="border w-full px-1"
              value={form.group_id ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  group_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.id} - {g.name}
                </option>
              ))}
            </select>
            <select
              className="border w-full px-1"
              value={form.source_kind}
              onChange={(e) =>
                setForm({ ...form, source_kind: e.target.value as AddPayload['source_kind'] })
              }
            >
              <option value="volume">volume</option>
              <option value="external">external</option>
              <option value="jdbc">jdbc</option>
            </select>
            <input
              className={`border w-full px-1 ${errors.catalog ? 'border-red-500' : ''}`}
              placeholder="Catalog"
              value={form.catalog}
              onChange={(e) => setForm({ ...form, catalog: e.target.value })}
            />
            <input
              className={`border w-full px-1 ${errors.schema_name ? 'border-red-500' : ''}`}
              placeholder="Schema"
              value={form.schema_name}
              onChange={(e) => setForm({ ...form, schema_name: e.target.value })}
            />
            <input
              className={`border w-full px-1 ${errors.table_name ? 'border-red-500' : ''}`}
              placeholder="Table Name"
              value={form.table_name}
              onChange={(e) => setForm({ ...form, table_name: e.target.value })}
            />
            <input
              className={`border w-full px-1 ${errors.source_path ? 'border-red-500' : ''}`}
              placeholder="Source Path"
              value={form.source_path}
              onChange={(e) => setForm({ ...form, source_path: e.target.value })}
            />
            <select
              className="border w-full px-1"
              value={form.file_format}
              onChange={(e) =>
                setForm({ ...form, file_format: e.target.value as AddPayload['file_format'] })
              }
            >
              <option value="parquet">parquet</option>
              <option value="csv">csv</option>
              <option value="json">json</option>
              <option value="avro">avro</option>
            </select>
            <select
              className="border w-full px-1"
              value={form.load_type}
              onChange={(e) =>
                setForm({ ...form, load_type: e.target.value as 'full' | 'incremental' })
              }
            >
              <option value="full">full</option>
              <option value="incremental">incremental</option>
            </select>
            <input
              className={`border w-full px-1 ${errors.pk_columns ? 'border-red-500' : ''}`}
              placeholder="id,date"
              value={form.pk_columns}
              onChange={(e) => setForm({ ...form, pk_columns: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Watermark Column"
              value={form.watermark_col}
              onChange={(e) => setForm({ ...form, watermark_col: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder='{"key":"value"}'
              value={form.ingest_options}
              onChange={(e) => setForm({ ...form, ingest_options: e.target.value })}
            />
            <div className="flex items-center gap-1">
              <input
                id="bronze-quarantine"
                type="checkbox"
                checked={form.quarantine}
                onChange={(e) => setForm({ ...form, quarantine: e.target.checked })}
              />
              <label htmlFor="bronze-quarantine">Quarantine</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!valid || saving}>
                {saving ? <Spinner className="h-4 w-4" /> : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
