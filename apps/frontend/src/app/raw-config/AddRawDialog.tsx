'use client'
import { useState } from 'react'
import Button from '../../components/ui/button'
import Spinner from '../../components/Spinner'
import { toast } from 'sonner'
import { createRawConfig, type RawConfig, type APIError } from '../../lib/api'

export interface AddPayload {
  source_kind: 'sftp' | 'jdbc' | 'api' | 'cloud_storage'
  source_system: string
  source_path: string
  ingestion_type: 'databricks' | 'adf'
  output_directory: string
  is_enabled: boolean
}

export default function AddRawDialog({ onCreate }: { onCreate(r: RawConfig): void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<AddPayload>({
    source_kind: 'sftp',
    source_system: '',
    source_path: '',
    ingestion_type: 'databricks',
    output_directory: '',
    is_enabled: true,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const valid =
    form.source_system.trim().length > 0 &&
    form.source_path.trim().length > 0 &&
    form.output_directory.trim().length > 0

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setErrors({})
    try {
      const row = await createRawConfig({
        ...form,
        group_id: null,
        connection_id: null,
        schedule_id: null,
        copy_options: {},
      })
      onCreate(row)
      toast.success('Raw Config added')
      setForm({
        source_kind: 'sftp',
        source_system: '',
        source_path: '',
        ingestion_type: 'databricks',
        output_directory: '',
        is_enabled: true,
      })
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
      <Button onClick={() => setOpen(true)}>Add Raw Config</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-80" onSubmit={submit}>
            <h2 className="font-semibold">Add Raw Config</h2>
            <select
              className="border w-full px-1"
              value={form.source_kind}
              onChange={(e) =>
                setForm({ ...form, source_kind: e.target.value as AddPayload['source_kind'] })
              }
            >
              <option value="sftp">sftp</option>
              <option value="jdbc">jdbc</option>
              <option value="api">api</option>
              <option value="cloud_storage">cloud_storage</option>
            </select>
            <input
              className={`border w-full px-1 ${errors.source_system ? 'border-red-500' : ''}`}
              placeholder="Source System"
              value={form.source_system}
              onChange={(e) => setForm({ ...form, source_system: e.target.value })}
            />
            <input
              className={`border w-full px-1 ${errors.source_path ? 'border-red-500' : ''}`}
              placeholder="Source Path"
              value={form.source_path}
              onChange={(e) => setForm({ ...form, source_path: e.target.value })}
            />
            <select
              className="border w-full px-1"
              value={form.ingestion_type}
              onChange={(e) =>
                setForm({ ...form, ingestion_type: e.target.value as AddPayload['ingestion_type'] })
              }
            >
              <option value="databricks">databricks</option>
              <option value="adf">adf</option>
            </select>
            <input
              className={`border w-full px-1 ${errors.output_directory ? 'border-red-500' : ''}`}
              placeholder="Output Directory"
              value={form.output_directory}
              onChange={(e) => setForm({ ...form, output_directory: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <input
                id="raw-enabled"
                type="checkbox"
                checked={form.is_enabled}
                onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
              />
              <label htmlFor="raw-enabled">Enabled</label>
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
