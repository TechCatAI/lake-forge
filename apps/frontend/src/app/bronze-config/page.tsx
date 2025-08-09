'use client'
import { useState, useEffect, useRef } from 'react'
import { Trash } from 'lucide-react'
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'
import { EditableCell } from '../../components/EditableCell'
import { JsonEditorCell } from '../../components/JsonEditorCell'
import Switch from '../../components/ui/switch'
import Button from '../../components/ui/button'
import GradientText from '../../components/GradientText'
import AddBronzeDialog from './AddBronzeDialog'
import { Tooltip } from '../../components/ui/tooltip'
import DataTable from '../../components/DataTable'
import {
  fetchBronzeConfigs,
  updateBronzeConfig,
  deleteBronzeConfig,
  fetchRawConfigs,
  fetchGroups,
  fetchSourceSystems,
  type BronzeConfig,
  type RawConfig,
  type Group,
  type SourceSystem,
  type APIError,
} from '../../lib/api'
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '../../components/ui/alert-dialog'

export default function BronzeConfigPage() {
  const [data, setData] = useState<BronzeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({})
  const [lastAdded, setLastAdded] = useState<number | null>(null)
  const [dirtyRows, setDirtyRows] = useState<Map<number, Partial<BronzeConfig>>>(new Map())
  const origData = useRef<Map<number, BronzeConfig>>(new Map())
  const [dirtyCount, setDirtyCount] = useState(0)
  const [savingAll, setSavingAll] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [sources, setSources] = useState<SourceSystem[]>([])
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number
    row: BronzeConfig
    index: number
  } | null>(null)
  const [rawOptions, setRawOptions] = useState<RawConfig[]>([])

  type BronzeWithExtras = BronzeConfig & {
    source_path?: string
    file_format?: string | null
  }

  function sanitize(row: BronzeWithExtras): BronzeConfig {
    const { source_path, file_format, ...rest } = row
    void source_path
    void file_format
    return rest
  }

  useEffect(() => {
    loadData()
    fetchRawConfigs().then(setRawOptions, () => setRawOptions([]))
    fetchGroups()
      .then((gs) => setGroups(gs))
      .catch(() => setGroups([]))
    fetchSourceSystems().then(setSources, () => setSources([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (lastAdded) {
      const el = firstCellRefs.current[lastAdded]
      el?.focus()
      setLastAdded(null)
    }
  }, [lastAdded])

  async function loadData() {
    try {
      setLoading(true)
      const rows = (
        (await fetchBronzeConfigs()) as BronzeWithExtras[]
      ).map(sanitize)
      setData(rows)
      origData.current = new Map(rows.map((r) => [r.id, r]))
      setDirtyRows(new Map())
      setDirtyCount(0)
    } catch (err) {
      const detail = (err as APIError).detail
      const msg = Array.isArray(detail) ? detail[0].msg : detail
      toast.error(msg || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  function handleEdit<K extends keyof BronzeConfig>(id: number, field: K, value: BronzeConfig[K]) {
    setData((ds) => ds.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    setDirtyRows((map) => {
      const next = new Map(map)
      const orig = origData.current.get(id)
      if (!orig) return next
      const prev = next.get(id) ?? {}
      const changed: Record<string, unknown> = { ...prev, [field]: value }
      if (orig[field] === value) delete changed[field as string]
      if (Object.keys(changed).length === 0) next.delete(id)
      else next.set(id, changed)
      const count = Array.from(next.values()).reduce((s, d) => s + Object.keys(d).length, 0)
      setDirtyCount(count)
      return next
    })
  }

  async function saveChanges() {
    const entries = Array.from(dirtyRows.entries())
    if (!entries.length) return
    setSavingAll(true)
    const before = new Map(entries.map(([id]) => [id, data.find((r) => r.id === id)]))
    const results = await Promise.all(
      entries.map(([id, delta]) =>
        updateBronzeConfig(id, delta).then(
          (row) => ({ id, row: sanitize(row as BronzeWithExtras) }),
          (err: APIError) => ({ id, err })
        )
      )
    )
    const remaining = new Map(dirtyRows)
    for (const res of results) {
      if ('row' in res) {
        setData((ds) => ds.map((r) => (r.id === res.id ? res.row : r)))
        origData.current.set(res.id, res.row)
        remaining.delete(res.id)
      } else {
        const prev = before.get(res.id)
        if (prev) setData((ds) => ds.map((r) => (r.id === res.id ? prev : r)))
        const msg = Array.isArray(res.err.detail) ? res.err.detail[0].msg : res.err.detail
        toast.error(msg || 'Error')
      }
    }
    setDirtyRows(remaining)
    const count = Array.from(remaining.values()).reduce((s, d) => s + Object.keys(d).length, 0)
    setDirtyCount(count)
    setSavingAll(false)
  }

  async function addRow(row: BronzeConfig) {
    const clean = sanitize(row as BronzeWithExtras)
    setData((d) => [clean, ...d])
    origData.current.set(clean.id, clean)
    setLastAdded(clean.id)
  }

  async function handleDelete(id: number, row: BronzeConfig, index: number) {
    setData((ds) => ds.filter((r) => r.id !== id))
    try {
      await deleteBronzeConfig(id)
      origData.current.delete(id)
      setDirtyRows((map) => {
        const next = new Map(map)
        next.delete(id)
        const count = Array.from(next.values()).reduce((s, d) => s + Object.keys(d).length, 0)
        setDirtyCount(count)
        return next
      })
      toast.success('Deleted')
    } catch (err) {
      setData((ds) => {
        const next = [...ds]
        next.splice(index, 0, row)
        return next
      })
      const detail = (err as APIError).detail
      const msg = Array.isArray(detail) ? detail[0].msg : detail
      toast.error(msg || 'Error deleting')
    }
  }

  const columns: ColumnDef<BronzeConfig>[] = [
    {
      accessorKey: 'is_enabled',
      header: 'Enabled',
      cell: ({ row, getValue }) => (
        <Switch checked={getValue<boolean>()} onChange={(v) => handleEdit(row.original.id, 'is_enabled', v)} />
      ),
    },
    {
      accessorKey: 'group_id',
      header: 'Group',
      cell: ({ row, getValue }) => {
        const val = getValue<number | null>() ?? null;
        return (
          <Tooltip content={val !== null ? String(val) : ''}>
            <select
              className="border rounded px-1"
              value={val ?? ''}
              onChange={(e) =>
                handleEdit(
                  row.original.id,
                  'group_id',
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">None</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id} title={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: 'raw_config_id',
      header: 'Raw Config',
      cell: ({ row, getValue }) => (
        <select
          className="border rounded px-1 w-full max-w-[16rem] truncate"
          defaultValue={getValue<number>()}
          onChange={(e) => handleEdit(row.original.id, 'raw_config_id', Number(e.target.value))}
        >
          {rawOptions.map((r) => {
            const name = sources.find((s) => s.id === r.source_system_id)?.name
            return (
              <option key={r.id} value={r.id}>
                {name ?? r.source_system_id} · {r.source_path}
              </option>
            )
          })}
        </select>
      ),
    },
    {
      accessorKey: 'catalog',
      header: 'Catalog',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, 'catalog', v)}
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
          onSave={(v) => handleEdit(row.original.id, 'schema_name', v)}
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
          onSave={(v) => handleEdit(row.original.id, 'table_name', v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'load_type',
      header: 'Load Type',
      cell: ({ row, getValue }) => {
        const val = getValue() as unknown
        if (typeof val !== 'string') return <span>{JSON.stringify(val)}</span>
        return (
          <select
            className="border rounded px-1"
            defaultValue={val}
            onChange={(e) => handleEdit(row.original.id, 'load_type', e.target.value as BronzeConfig['load_type'])}
          >
            <option value="full">full</option>
            <option value="incremental">incremental</option>
            <option value="append">append</option>
            <option value="mergedelete">mergedelete</option>
          </select>
        )
      },
    },
    {
      accessorKey: 'pk_columns',
      header: 'PK Columns',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string[]>()}
          onSave={(v) => handleEdit(row.original.id, 'pk_columns', v)}
          parse={(v) => v.split(',').map((s) => s.trim()).filter(Boolean)}
          format={(v) => (Array.isArray(v) ? v.join(', ') : '')}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'watermark_col',
      header: 'Watermark Column',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string | null>() ?? ''}
          onSave={(v) => handleEdit(row.original.id, 'watermark_col', v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'ingest_options',
      header: 'Ingest Options',
      cell: ({ row, getValue }) => (
        <JsonEditorCell
          initialValue={getValue<Record<string, unknown>>() ?? {}}
          onSave={(v) => handleEdit(row.original.id, 'ingest_options', v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'quarantine',
      header: 'Quarantine',
      cell: ({ row, getValue }) => (
        <Switch checked={getValue<boolean>()} onChange={(v) => handleEdit(row.original.id, 'quarantine', v)} />
      ),
    },
    {
      accessorKey: 'is_stream',
      header: 'Streaming',
      cell: ({ row, getValue }) => (
        <Switch checked={getValue<boolean>()} onChange={(v) => handleEdit(row.original.id, 'is_stream', v)} />
      ),
    },
    {
      accessorKey: 'clusterby_cols',
      header: 'Liquid Clustering',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string[] | null>() ?? []}
          onSave={(v) => handleEdit(row.original.id, 'clusterby_cols', Array.isArray(v) && v.length ? v : [])}
          parse={(v) => v.split(',').map((s) => s.trim()).filter(Boolean)}
          format={(v) => (Array.isArray(v) ? v.join(', ') : '')}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'scd_type',
      header: 'SCD Type',
      cell: ({ row, getValue }) => (
        <select
          className="border rounded px-1"
          value={getValue<number | null>() ?? ''}
          onChange={(e) =>
            handleEdit(
              row.original.id,
              'scd_type',
              e.target.value ? Number(e.target.value) : null,
            )
          }
        >
          <option value="">None</option>
          {[0, 1, 2, 3, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      ),
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated At',
      cell: ({ getValue }) => {
        const val = getValue() as string | null
        if (!val) return <div className="text-right">&mdash;</div>
        const date = new Date(val)
        return (
          <div className="text-right">
            {date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-4 w-full">
      <div className="sticky top-0 bg-background z-10 mb-2 w-full">
        <div className="relative flex justify-center w-full">
          <GradientText
            animationSpeed={3}
            showBorder={false}
            className="text-2xl font-bold font-display"
          >
            Bronze Config
          </GradientText>
          <div className="absolute right-0 top-0 flex items-center gap-2">
            {dirtyCount > 0 && (
              <Button onClick={saveChanges} disabled={savingAll}>
                {savingAll && (
                  <span className="h-4 w-4 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                Save changes ({dirtyCount})
              </Button>
            )}
            <AddBronzeDialog onCreate={addRow} />
          </div>
        </div>
      </div>
      <div className="overflow-auto w-full">
        <DataTable
          table={table}
          cellRef={(row, idx) =>
            idx === 2
              ? (el) => {
                  firstCellRefs.current[row.original.id] = el;
                }
              : undefined
          }
          renderRowActions={(row) => (
            <Trash
              className="h-4 w-4 opacity-0 group-hover:opacity-100 text-red-500 cursor-pointer"
              onClick={() =>
                setConfirmDelete({ id: row.original.id, row: row.original, index: row.index })
              }
            />
          )}
        />
      </div>
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        {confirmDelete && (
          <>
            <AlertDialogTitle>Delete row?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            <AlertDialogFooter>
              <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (confirmDelete)
                    handleDelete(confirmDelete.id, confirmDelete.row, confirmDelete.index).then(() =>
                      setConfirmDelete(null)
                    )
                }}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialog>
    </div>
  )
}
