'use client'
import { useState, useEffect, useRef } from 'react'
import { Trash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'
import { EditableCell, Switch } from '../../components/EditableCell'
import Button from '../../components/ui/button'
import GradientText from '../../components/GradientText'
import AddRawDialog from './AddRawDialog'
import Tooltip from '../../components/ui/tooltip'
import {
  fetchRawConfigs,
  updateRawConfig,
  deleteRawConfig,
  fetchGroups,
  fetchSourceSystems,
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

export default function RawConfigPage() {
  const [data, setData] = useState<RawConfig[]>([])
  const [loading, setLoading] = useState(true)
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({})
  const [lastAdded, setLastAdded] = useState<number | null>(null)
  const [dirtyRows, setDirtyRows] = useState<Map<number, Partial<RawConfig>>>(new Map())
  const origData = useRef<Map<number, RawConfig>>(new Map())
  const [dirtyCount, setDirtyCount] = useState(0)
  const [savingAll, setSavingAll] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [sources, setSources] = useState<SourceSystem[]>([])
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number
    row: RawConfig
    index: number
  } | null>(null)

  useEffect(() => {
    loadData()
    fetchGroups()
      .then((gs) => setGroups(gs))
      .catch(() => setGroups([]))
    fetchSourceSystems().then(setSources, () => setSources([]))
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
      const rows = await fetchRawConfigs()
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

  function handleEdit<K extends keyof RawConfig>(id: number, field: K, value: RawConfig[K]) {
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
        updateRawConfig(id, delta).then(
          (row) => ({ id, row }),
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

  async function addRow(row: RawConfig) {
    setData((d) => [row, ...d])
    origData.current.set(row.id, row)
    setLastAdded(row.id)
  }

  async function handleDelete(id: number, row: RawConfig, index: number) {
    setData((ds) => ds.filter((r) => r.id !== id))
    try {
      await deleteRawConfig(id)
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

  const columns: ColumnDef<RawConfig>[] = [
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
      accessorKey: 'source_system_id',
      header: 'Source System',
      cell: ({ row, getValue }) => (
        <select
          className="border rounded px-1"
          value={getValue<number | null>() ?? ''}
          onChange={(e) =>
            handleEdit(
              row.original.id,
              'source_system_id',
              e.target.value ? Number(e.target.value) : null,
            )
          }
        >
          <option value="">None</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      accessorKey: 'source_path',
      header: 'Source Path',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, 'source_path', v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: 'ingestion_type',
      header: 'Ingestion Type',
      cell: ({ row, getValue }) => (
        <select
          className="border rounded px-1"
          defaultValue={getValue<string>()}
          onChange={(e) => handleEdit(row.original.id, 'ingestion_type', e.target.value as RawConfig['ingestion_type'])}
        >
          <option value="databricks">databricks</option>
          <option value="adf">adf</option>
        </select>
      ),
    },
    {
      accessorKey: 'output_directory',
      header: 'Output Directory',
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, 'output_directory', v)}
          className="text-left"
        />
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

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-4 overflow-auto">
      <div className="relative mb-2 sticky top-0 bg-background z-10 flex justify-center">
        <GradientText
          colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
          animationSpeed={3}
          showBorder={false}
          className="text-2xl font-bold font-display"
        >
          Raw Config
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
          <AddRawDialog onCreate={addRow} />
        </div>
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
          <AnimatePresence initial={false}>
            {table.getRowModel().rows.map((row) => (
              <motion.tr
                layout
                exit={{ opacity: 0 }}
                key={row.id}
                className="group even:bg-zinc-900/40 hover:bg-zinc-700 transition-colors"
              >
                {row.getVisibleCells().map((cell, idx) => (
                  <td
                    key={cell.id}
                    className="border px-2"
                    ref={idx === 2 ? (el) => { firstCellRefs.current[row.original.id] = el } : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                <td className="border px-2 text-right w-8">
                  <Trash
                    className="h-4 w-4 opacity-0 group-hover:opacity-100 text-red-500 cursor-pointer"
                    onClick={() => setConfirmDelete({ id: row.original.id, row: row.original, index: row.index })}
                  />
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
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
