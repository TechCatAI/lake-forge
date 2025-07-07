'use client'
import { useState, useEffect, useRef } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import Button from '../../components/ui/button'
import LoadingSpinner from '../../components/LoadingSpinner'
import { EditableCell, Switch } from './editors'

interface TableRow {
  id: number
  is_enabled: boolean
  source_system: string
  catalog: string
  schema_name: string
  table_name: string
  load_type: 'full' | 'incremental'
  pk_columns: string[]
  updated_at: string
}

export default function TableConfigPage() {
  const [data, setData] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({})
  const [lastAdded, setLastAdded] = useState<number | null>(null)
  const patchTimers = useRef<Record<string, NodeJS.Timeout>>({})

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    if (lastAdded) {
      const el = firstCellRefs.current[lastAdded]
      el?.focus()
      setLastAdded(null)
    }
  }, [lastAdded])

  async function fetchTables() {
    try {
      setLoading(true)
      const resp = await fetch('/api/tables')
      const rows = await resp.json()
      setData(rows)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  function updateRow<K extends keyof TableRow>(
    id: number,
    field: K,
    value: TableRow[K],
  ) {
    const prev = data
    setData((ds) => ds.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    const key = `${id}-${String(field)}`
    clearTimeout(patchTimers.current[key])
    patchTimers.current[key] = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/tables/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        })
        if (!resp.ok) throw new Error('error')
        const row = await resp.json()
        setData((ds) => ds.map((r) => (r.id === id ? row : r)))
        showToast('Saved')
      } catch {
        setData(prev)
        showToast('Error')
      }
    }, 250)
  }

  async function addRow(payload: AddPayload) {
    try {
      const resp = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) throw new Error('bad')
      const row = await resp.json()
      setData((d) => [row, ...d])
      showToast('Row added')
      setLastAdded(row.id)
    } catch {
      showToast('Error')
    }
  }

  const columns: ColumnDef<TableRow>[] = [
    {
      accessorKey: 'is_enabled',
      header: 'Enabled',
      cell: ({ row, getValue }) => (
        <Switch
          checked={getValue<boolean>()}
          onChange={(v) => updateRow(row.original.id, 'is_enabled', v)}
        />
      ),
    },
    {
      accessorKey: 'source_system',
      header: 'Source System',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => updateRow(row.original.id, 'source_system', v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'catalog',
      header: 'Catalog',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => updateRow(row.original.id, 'catalog', v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'schema_name',
      header: 'Schema',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => updateRow(row.original.id, 'schema_name', v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'table_name',
      header: 'Table Name',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => updateRow(row.original.id, 'table_name', v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'load_type',
      header: 'Load Type',
      cell: ({ row, getValue }) => (
        <select
          className="border rounded px-1"
          defaultValue={getValue<string>()}
          onChange={(e) =>
            updateRow(
              row.original.id,
              'load_type',
              e.target.value as TableRow['load_type'],
            )
          }
        >
          <option value="full">full</option>
          <option value="incremental">incremental</option>
        </select>
      ),
    },
    {
      accessorKey: 'pk_columns',
      header: 'PK Columns',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string[]>()}
          onSave={(v) => updateRow(row.original.id, 'pk_columns', v)}
          parse={(v) => v.split(',').map((s) => s.trim()).filter(Boolean)}
          format={(v) => (Array.isArray(v) ? v.join(', ') : '')}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated At',
      cell: ({ getValue }) => (
        <div className="text-right">
          {new Date(getValue<string>()).toLocaleString()}
        </div>
      ),
    },
  ]

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-4 overflow-auto">
      <div className="flex justify-between mb-2 sticky top-0 bg-background z-10">
        <h1 className="text-2xl font-bold">Table Configuration</h1>
        <AddTable onCreate={addRow} />
      </div>
      {toast && (
        <div className="fixed top-4 right-4 bg-black text-white px-3 py-2 rounded">
          {toast}
        </div>
      )}
      <table className="min-w-full text-sm border-collapse">
        <thead className="sticky top-10 bg-background">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th key={header.id} className="border px-2 text-left">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell, idx) => (
                <td
                  key={cell.id}
                  className="border px-2"
                  ref={idx === 1 ? (el) => {
                    firstCellRefs.current[row.original.id] = el
                  } : undefined}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type AddPayload = Omit<TableRow, 'id' | 'updated_at'> & {
  source_kind: string
  source_path: string
  file_format: string | null
  connection_id: number | null
  ingest_options: Record<string, unknown>
}

function AddTable({ onCreate }: { onCreate(payload: AddPayload): void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    source_system: '',
    catalog: '',
    schema_name: '',
    table_name: '',
    load_type: 'full',
    pk_columns: '',
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onCreate({
      source_system: form.source_system,
      catalog: form.catalog,
      schema_name: form.schema_name,
      table_name: form.table_name,
      load_type: form.load_type as TableRow['load_type'],
      pk_columns: form.pk_columns.split(',').map((s) => s.trim()).filter(Boolean),
      source_kind: 'volume',
      is_enabled: true,
      source_path: '',
      file_format: null,
      connection_id: null,
      ingest_options: {},
    })
    setForm({
      source_system: '',
      catalog: '',
      schema_name: '',
      table_name: '',
      load_type: 'full',
      pk_columns: '',
    })
    setOpen(false)
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Add Table</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-72" onSubmit={submit}>
            <h2 className="font-semibold">Add Table</h2>
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
            <select
              className="border w-full px-1"
              value={form.load_type}
              onChange={(e) => setForm({ ...form, load_type: e.target.value })}
            >
              <option value="full">full</option>
              <option value="incremental">incremental</option>
            </select>
            <input
              className="border w-full px-1"
              placeholder="PK Columns"
              value={form.pk_columns}
              onChange={(e) => setForm({ ...form, pk_columns: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
