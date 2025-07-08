"use client";
import { useState, useEffect, useRef } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "sonner";
import { EditableCell, Switch } from "./EditableCell";
import Button from "../../components/ui/button";
import AddTableDialog from "./AddTableDialog";
import {
  fetchTables,
  updateTable,
  type TableConfig,
  type APIError,
} from "../../lib/api";

export default function TableConfigPage() {
  const [data, setData] = useState<TableConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({});
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [dirtyRows, setDirtyRows] = useState<Map<number, Partial<TableConfig>>>(
    new Map(),
  );
  const origData = useRef<Map<number, TableConfig>>(new Map());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (lastAdded) {
      const el = firstCellRefs.current[lastAdded];
      el?.focus();
      setLastAdded(null);
    }
  }, [lastAdded]);

  async function loadTables() {
    try {
      setLoading(true);
      const rows = await fetchTables();
      setData(rows);
      origData.current = new Map(rows.map((r) => [r.id, r]));
      setDirtyRows(new Map());
      setDirtyCount(0);
    } catch (err) {
      const detail = (err as APIError).detail;
      const msg = Array.isArray(detail) ? detail[0].msg : detail;
      toast.error(msg || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit<K extends keyof TableConfig>(
    id: number,
    field: K,
    value: TableConfig[K],
  ) {
    setData((ds) => ds.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    setDirtyRows((map) => {
      const next = new Map(map)
      const orig = origData.current.get(id)
      if (!orig) return next
      const prev = next.get(id) ?? {}
      const changed = { ...prev, [field]: value }
      if (orig[field] === value) {
        delete (changed as Record<string, unknown>)[field as string]
      }
      if (Object.keys(changed).length === 0) next.delete(id)
      else next.set(id, changed)
      const count = Array.from(next.values()).reduce(
        (sum, d) => sum + Object.keys(d).length,
        0,
      )
      setDirtyCount(count)
      return next
    })
  }

  async function saveChanges() {
    const entries = Array.from(dirtyRows.entries());
    if (!entries.length) return;
    setSavingAll(true);
    const before = new Map(
      entries.map(([id]) => [id, data.find((r) => r.id === id)]),
    );
    const results = await Promise.all(
      entries.map(([id, delta]) =>
        updateTable(id, delta).then(
          (row) => ({ id, row }),
          (err: APIError) => ({ id, err }),
        ),
      ),
    );

    const remaining = new Map(dirtyRows);
    for (const res of results) {
      if ('row' in res) {
        setData((ds) => ds.map((r) => (r.id === res.id ? res.row : r)));
        origData.current.set(res.id, res.row);
        remaining.delete(res.id);
      } else {
        const prev = before.get(res.id);
        if (prev)
          setData((ds) => ds.map((r) => (r.id === res.id ? prev : r)));
        const msg = Array.isArray(res.err.detail)
          ? res.err.detail[0].msg
          : res.err.detail;
        toast.error(msg || 'Error');
      }
    }
    setDirtyRows(remaining);
    const count = Array.from(remaining.values()).reduce(
      (sum, d) => sum + Object.keys(d).length,
      0,
    );
    setDirtyCount(count);
    if (count === 0) toast.success('Saved');
    setSavingAll(false);
  }

  function addRow(row: TableConfig) {
    setData((d) => [row, ...d]);
    origData.current.set(row.id, row);
    setLastAdded(row.id);
  }

  const columns: ColumnDef<TableConfig>[] = [
    {
      accessorKey: "is_enabled",
      header: "Enabled",
      cell: ({ row, getValue }) =>
        <Switch
          checked={getValue<boolean>()}
          onChange={(v) => handleEdit(row.original.id, "is_enabled", v)}
        />,
    },
    {
      accessorKey: "source_system",
      header: "Source System",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, "source_system", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "catalog",
      header: "Catalog",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, "catalog", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "schema_name",
      header: "Schema",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, "schema_name", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "table_name",
      header: "Table Name",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, "table_name", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "load_type",
      header: "Load Type",
      cell: ({ row, getValue }) => {
        const val = getValue() as unknown;
        if (typeof val !== "string") return <span>{JSON.stringify(val)}</span>;
        return (
          <select
            className="border rounded px-1"
            defaultValue={val}
            onChange={(e) =>
              handleEdit(
                row.original.id,
                "load_type",
                e.target.value as TableConfig["load_type"],
              )
            }
          >
            <option value="full">full</option>
            <option value="incremental">incremental</option>
          </select>
        );
      },
    },
    {
      accessorKey: "pk_columns",
      header: "PK Columns",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string[]>()}
          onSave={(v) => handleEdit(row.original.id, "pk_columns", v)}
          parse={(v) =>
            v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          }
          format={(v) => (Array.isArray(v) ? v.join(", ") : "")}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated At",
      cell: ({ getValue }) => {
        const val = getValue() as string | null
        if (!val) return <div className="text-right">&mdash;</div>
        const date = new Date(val)
        return (
          <div className="text-right">
            {date.toLocaleString('en-US', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </div>
        )
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 overflow-auto">
      <div className="flex justify-between mb-2 sticky top-0 bg-background z-10">
        <h1 className="text-2xl font-bold text-blueprint-blue font-display">
          Table Configuration
        </h1>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <Button onClick={saveChanges} disabled={savingAll}>
              {savingAll && (
                <span className="h-4 w-4 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              Save changes ({dirtyCount})
            </Button>
          )}
          <AddTableDialog onCreate={addRow} />
        </div>
      </div>
      <table className="min-w-full text-sm border-collapse">
        <thead className="sticky top-10 bg-background">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th key={header.id} className="border px-2 text-left">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="even:bg-zinc-900/40 hover:bg-zinc-700 transition-colors"
            >
              {row.getVisibleCells().map((cell, idx) => {
                const value = cell.getValue();
                return (
                  <td
                    key={cell.id}
                    className="border px-2"
                    ref={
                      idx === 1
                        ? (el) => {
                            firstCellRefs.current[row.original.id] = el;
                          }
                        : undefined
                    }
                  >
                    {typeof value === "object" && !cell.column.columnDef.cell
                      ? JSON.stringify(value)
                      : flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
