'use client'
import { useState, useEffect, useRef } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import LoadingSpinner from '../../components/LoadingSpinner'
import Spinner from '../../components/Spinner'
import { toast } from 'sonner'
import { EditableCell, Switch } from './editors'
import AddTableDialog, { AddPayload } from './AddTableDialog'
import {
  fetchTables,
  updateTable,
  createTable,
  type TableConfig,
  type APIError,
} from '../../lib/api'

export default function TableConfigPage() {
  const [data, setData] = useState<TableConfig[]>([])
  const [loading, setLoading] = useState(true)
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({})
  const [lastAdded, setLastAdded] = useState<number | null>(null)
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadTables()
  }, [])

  useEffect(() => {
    if (lastAdded) {
      const el = firstCellRefs.current[lastAdded]
      el?.focus()
      setLastAdded(null)
    }
  }, [lastAdded])

  async function loadTables() {
    try {
      setLoading(true)
      const rows = await fetchTables()
      setData(rows)
    } catch (err) {
      toast.error((err as APIError).detail || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  function handleSave<K extends keyof TableConfig>(
    id: number,
    field: K,
    value: TableConfig[K],
  ) {
    const prev = data
    setData((ds) => ds.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    const key = `${id}-${String(field)}`
    setSaving((s) => ({ ...s, [key]: true }))
    updateTable(id, { [field]: value })
      .then((row) => {
        setData((ds) => ds.map((r) => (r.id === id ? row : r)))
        toast.success('Saved')
      })
      .catch((err: APIError) => {
        setData(prev)
        toast.error(err.detail || 'Error')
      })
      .finally(() =>
        setSaving((s) => {
          const { [key]: removed, ...rest } = s
          void removed
          return rest
        }),
      )
  }

  async function addRow(payload: AddPayload) {
    try {
      const row = await createTable({
        ...payload,
        pk_columns: payload.pk_columns.split(',').map((p) => p.trim()).filter(Boolean),
        source_kind: 'volume',
        is_enabled: true,
        file_format: null,
        connection_id: null,
        ingest_options: {},
      })
      setData((d) => [row, ...d])
      toast.success('Table Config added')
      setLastAdded(row.id)
    } catch (err) {
      toast.error((err as APIError).detail || 'Error')
    }
  }

  const columns: ColumnDef<TableConfig>[] = [
    {
      accessorKey: 'is_enabled',
      header: 'Enabled',
      cell: ({ row, getValue }) => (
        saving[`${row.original.id}-is_enabled`] ? (
          <div className="flex justify-center py-1">
            <Spinner className="h-4 w-4" />
          </div>
        ) : (
          <Switch
            checked={getValue<boolean>()}
            onChange={(v) => handleSave(row.original.id, 'is_enabled', v)}
          />
        )
      ),
    },
    {
      accessorKey: 'source_system',
      header: 'Source System',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleSave(row.original.id, 'source_system', v)}
          className="text-left"
          saving={saving[`${row.original.id}-source_system`]}
        />
      ),
    },
    {
      accessorKey: 'catalog',
      header: 'Catalog',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleSave(row.original.id, 'catalog', v)}
          className="text-left"
          saving={saving[`${row.original.id}-catalog`]}
        />
      ),
    },
    {
      accessorKey: 'schema_name',
      header: 'Schema',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleSave(row.original.id, 'schema_name', v)}
          className="text-left"
          saving={saving[`${row.original.id}-schema_name`]}
        />
      ),
    },
    {
      accessorKey: 'table_name',
      header: 'Table Name',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleSave(row.original.id, 'table_name', v)}
          className="text-left"
          saving={saving[`${row.original.id}-table_name`]}
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
            handleSave(
              row.original.id,
              'load_type',
              e.target.value as TableConfig['load_type'],
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
          onSave={(v) => handleSave(row.original.id, 'pk_columns', v)}
          parse={(v) => v.split(',').map((s) => s.trim()).filter(Boolean)}
          format={(v) => (Array.isArray(v) ? v.join(', ') : '')}
          className="text-left"
          saving={saving[`${row.original.id}-pk_columns`]}
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
        <AddTableDialog onCreate={addRow} />
      </div>
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

