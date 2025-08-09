"use client";
import { useState, useEffect, useRef } from "react";
import { Trash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "sonner";
import { EditableCell } from "../../components/EditableCell";
import Switch from '../../components/ui/switch'
import Button from "../../components/ui/button";
import GradientText from "../../components/GradientText";
import AddTableDialog from "./AddTableDialog";
import {
  fetchTables,
  updateTable,
  deleteTable,
  type TableConfig,
  type APIError,
  fetchGroups,
  type Group,
} from "../../lib/api";
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "../../components/ui/alert-dialog";

export default function TableConfigPage() {
  const [data, setData] = useState<TableConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({});
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [dirtyRows, setDirtyRows] = useState<Map<number, Partial<TableConfig>>>(
    new Map(),
  );
  const origData = useRef<Map<number, TableConfig>>(new Map());
  const [groups, setGroups] = useState<Group[]>([]);
  const [dirtyCount, setDirtyCount] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number;
    row: TableConfig;
    index: number;
  } | null>(null);

  useEffect(() => {
    loadTables();
    fetchGroups().then(setGroups, () => setGroups([]));
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

  async function handleDelete(id: number, row: TableConfig, index: number) {
    setData((ds) => ds.filter((r) => r.id !== id));
    try {
      await deleteTable(id);
      origData.current.delete(id);
      setDirtyRows((map) => {
        const next = new Map(map);
        next.delete(id);
        const count = Array.from(next.values()).reduce(
          (sum, d) => sum + Object.keys(d).length,
          0,
        );
        setDirtyCount(count);
        return next;
      });
      toast.success('Deleted');
    } catch (err) {
      setData((ds) => {
        const next = [...ds];
        next.splice(index, 0, row);
        return next;
      });
      const detail = (err as APIError).detail;
      const msg = Array.isArray(detail) ? detail[0].msg : detail;
      toast.error(msg || 'Error deleting');
    }
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
      accessorKey: "group_id",
      header: "Group",
      cell: ({ row, getValue }) => (
        <select
          className="border rounded px-1"
          defaultValue={getValue<number | null>() ?? ''}
          onChange={(e) =>
            handleEdit(
              row.original.id,
              "group_id",
              e.target.value ? Number(e.target.value) : null,
            )
          }
        >
          <option value="">None</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      ),
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
      accessorKey: "source_path",
      header: "Source Path",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, "source_path", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "file_format",
      header: "File Format",
      cell: ({ row, getValue }) => (
        <select
          className="border rounded px-1 w-28"
          defaultValue={getValue<string>() ?? "parquet"}
          onChange={(e) =>
            handleEdit(
              row.original.id,
              "file_format",
              e.target.value as TableConfig["file_format"],
            )
          }
        >
          <option value="parquet">parquet</option>
          <option value="csv">csv</option>
          <option value="json">json</option>
          <option value="avro">avro</option>
        </select>
      ),
    },
    {
      accessorKey: "ingest_options",
      header: "Ingest Options",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<Record<string, unknown>>()}
          onSave={(v) => handleEdit(row.original.id, "ingest_options", v)}
          format={(v) => JSON.stringify(v ?? {})}
          parse={(v) => {
            try {
              return JSON.parse(v);
            } catch {
              return {};
            }
          }}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "quarantine",
      header: "Quarantine",
      cell: ({ row, getValue }) => (
        <Switch
          checked={getValue<boolean>()}
          onChange={(v) => handleEdit(row.original.id, "quarantine", v)}
        />
      ),
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 w-full">
      <div className="sticky top-0 bg-background z-10 mb-2 w-full">
        <div className="relative flex justify-center w-full">
          <GradientText
            animationSpeed={3}
            showBorder={false}
            className="text-2xl font-bold font-display"
          >
            Table Configuration
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
            <AddTableDialog onCreate={addRow} />
          </div>
        </div>
        </div>
        <div className="overflow-auto w-full">
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
          <AnimatePresence initial={false}>
            {table.getRowModel().rows.map((row) => (
              <motion.tr
                layout
                exit={{ opacity: 0 }}
                key={row.id}
                className="group even:bg-zinc-900/40 hover:bg-zinc-700 transition-colors"
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
                <td className="border px-2 text-right w-8">
                  <Trash
                    className="h-4 w-4 opacity-0 group-hover:opacity-100 text-red-500 cursor-pointer"
                    onClick={() =>
                      setConfirmDelete({
                        id: row.original.id,
                        row: row.original,
                        index: row.index,
                      })
                    }
                  />
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
      </div>
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        {confirmDelete && (
          <>
            <AlertDialogTitle>Delete row?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (confirmDelete)
                    handleDelete(
                      confirmDelete.id,
                      confirmDelete.row,
                      confirmDelete.index,
                    ).then(() => setConfirmDelete(null));
                }}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialog>
    </div>
  );
}
