'use client'
import { useState } from 'react'
import Button from '../../components/ui/button'

export interface AddPayload {
  source_system: string
  catalog: string
  schema_name: string
  table_name: string
  source_path: string
  load_type: 'full' | 'incremental'
  pk_columns: string
}

export default function AddTableDialog({
  onCreate,
}: {
  onCreate(payload: AddPayload): void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<AddPayload>({
    source_system: '',
    catalog: '',
    schema_name: '',
    table_name: '',
    source_path: '',
    load_type: 'full',
    pk_columns: '',
  })

  const valid =
    form.source_system &&
    form.catalog &&
    form.schema_name &&
    form.table_name &&
    form.source_path &&
    form.pk_columns

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!valid) return
    onCreate(form)
    setForm({
      source_system: '',
      catalog: '',
      schema_name: '',
      table_name: '',
      source_path: '',
      load_type: 'full',
      pk_columns: '',
    })
    setOpen(false)
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Add Table Config</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-80" onSubmit={submit}>
            <h2 className="font-semibold">Add Table Config</h2>
            <input
              className="border w-full px-1"
              placeholder="Source System"
              value={form.source_system}
              onChange={(e) => setForm({ ...form, source_system: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Catalog"
              value={form.catalog}
              onChange={(e) => setForm({ ...form, catalog: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Schema"
              value={form.schema_name}
              onChange={(e) => setForm({ ...form, schema_name: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Table Name"
              value={form.table_name}
              onChange={(e) => setForm({ ...form, table_name: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Source Path"
              value={form.source_path}
              onChange={(e) => setForm({ ...form, source_path: e.target.value })}
            />
            <select
              className="border w-full px-1"
              value={form.load_type}
              onChange={(e) => setForm({ ...form, load_type: e.target.value as 'full' | 'incremental' })}
            >
              <option value="full">full</option>
              <option value="incremental">incremental</option>
            </select>
            <input
              className="border w-full px-1"
              placeholder="PK Columns"
              value={form.pk_columns}
              onChange={(e) => setForm({ ...form, pk_columns: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!valid}>
                Create
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
