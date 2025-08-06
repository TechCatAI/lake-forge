'use client'
import React, { useState, useEffect } from 'react'
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import DataTable from './DataTable'
import { EditableCell } from './EditableCell'
import Button from './ui/button'
import { Select, SelectItem } from './ui/select'
import { toast } from 'sonner'
import {
  DQSuggestion,
  updateDQSuggestion,
  bulkUpdateDQSuggestions,
  implementDQSuggestions,
} from '../lib/api'

interface Props {
  suggestions: DQSuggestion[]
  refresh: () => Promise<void>
}

export default function DQSuggestionTable({ suggestions, refresh }: Props) {
  const [data, setData] = useState<DQSuggestion[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sorting, setSorting] = useState<SortingState>([])

  useEffect(() => setData(suggestions), [suggestions])

  function updateLocal(id: number, delta: Partial<DQSuggestion>) {
    setData((ds) => ds.map((r) => (r.id === id ? { ...r, ...delta } : r)))
  }

  async function handleEdit<K extends keyof DQSuggestion>(
    id: number,
    field: K,
    value: DQSuggestion[K],
  ) {
    updateLocal(id, { [field]: value } as Partial<DQSuggestion>)
    try {
      await updateDQSuggestion(id, { [field]: value } as Partial<DQSuggestion>)
    } catch (error) {
      console.error(error)
      toast.error('Save failed')
      await refresh()
    }
  }

  function toggleSelect(id: number) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(data.map((d) => d.id)) : new Set())
  }

  async function bulk(action: 'accept' | 'reject') {
    const ids = Array.from(selected)
    try {
      await bulkUpdateDQSuggestions(ids, action)
      setData((ds) =>
        ds.map((r) =>
          selected.has(r.id)
            ? { ...r, suggestion_status: action === 'accept' ? 'accepted' : 'rejected' }
            : r,
        ),
      )
      toast.success('Updated')
    } catch (error) {
      console.error(error)
      toast.error('Bulk failed')
    }
  }

  async function submit() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    if (!window.confirm('Implement selected suggestions?')) return
    try {
      await implementDQSuggestions(ids)
      setData((ds) => ds.filter((r) => !selected.has(r.id)))
      setSelected(new Set())
      toast.success('Implemented')
      await refresh()
    } catch (error) {
      console.error(error)
      toast.error('Implement failed')
    }
  }

  const columns: ColumnDef<DQSuggestion>[] = [
    {
      id: 'select',
      enableSorting: false,
      header: () => (
        <input
          type="checkbox"
          checked={selected.size === data.length && data.length > 0}
          onChange={(e) => toggleAll(e.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selected.has(row.original.id)}
          onChange={() => toggleSelect(row.original.id)}
        />
      ),
    },
    { accessorKey: 'table_name', header: 'table_name' },
    {
      accessorKey: 'rule_name',
      header: 'rule_name',
      cell: ({ row }) => (
        <EditableCell
          initialValue={row.original.rule_name}
          onSave={(v) => handleEdit(row.original.id, 'rule_name', v)}
        />
      ),
    },
    {
      accessorKey: 'rule_sql',
      header: 'rule_sql',
      cell: ({ row }) => (
        <EditableCell
          className="w-60"
          initialValue={row.original.rule_sql}
          onSave={(v) => handleEdit(row.original.id, 'rule_sql', v)}
        />
      ),
    },
    {
      accessorKey: 'severity',
      header: 'severity',
      cell: ({ row }) => (
        <Select
          value={row.original.severity}
          onValueChange={(v) =>
            handleEdit(row.original.id, 'severity', v as DQSuggestion['severity'])
          }
        >
          <SelectItem value="warn">warn</SelectItem>
          <SelectItem value="fail">fail</SelectItem>
          <SelectItem value="drop">drop</SelectItem>
        </Select>
      ),
    },
    { accessorKey: 'suggestion_status', header: 'suggestion_status' },
    { accessorKey: 'profiled_at', header: 'profiled_at' },
    {
      accessorKey: 'note',
      header: 'note',
      cell: ({ row }) => (
        <EditableCell
          initialValue={row.original.note ?? ''}
          onSave={(v) => handleEdit(row.original.id, 'note', v)}
        />
      ),
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

  const anySelected = selected.size > 0
  const allAccepted = anySelected && Array.from(selected).every((id) => data.find((r) => r.id === id)?.suggestion_status === 'accepted')

  return (
    <div className="space-y-2">
      {anySelected && (
        <div className="flex justify-end gap-2">
          <Button onClick={() => bulk('accept')}>Accept</Button>
          <Button onClick={() => bulk('reject')}>Reject</Button>
          <Button disabled={!allAccepted} onClick={submit}>
            Submit
          </Button>
        </div>
      )}
      <DataTable table={table} />
    </div>
  )
}
