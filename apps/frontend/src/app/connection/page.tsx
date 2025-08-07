"use client";
import { useState, useEffect, useRef } from "react";
import { Trash } from "lucide-react";
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "sonner";
import { EditableCell } from "../../components/EditableCell";
import { JsonEditorCell } from "../../components/JsonEditorCell";
import Button from "../../components/ui/button";
import GradientText from "../../components/GradientText";
import AddConnectionDialog from "./AddConnectionDialog";
import DataTable from "../../components/DataTable";
import {
  fetchConnections,
  updateConnection,
  deleteConnection,
  type Connection,
  type APIError,
} from "../../lib/api";
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "../../components/ui/alert-dialog";

export default function ConnectionPage() {
  const [data, setData] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({});
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [dirtyRows, setDirtyRows] = useState<Map<number, Partial<Connection>>>(new Map());
  const origData = useRef<Map<number, Connection>>(new Map());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number;
    row: Connection;
    index: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (lastAdded) {
      const el = firstCellRefs.current[lastAdded];
      el?.focus();
      setLastAdded(null);
    }
  }, [lastAdded]);

  async function loadData() {
    try {
      setLoading(true);
      const rows = await fetchConnections();
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

  function handleEdit<K extends keyof Connection>(id: number, field: K, value: Connection[K]) {
    setData((ds) => ds.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setDirtyRows((map) => {
      const next = new Map(map);
      const orig = origData.current.get(id);
      if (!orig) return next;
      const prev = next.get(id) ?? {};
      const changed: Record<string, unknown> = { ...prev, [field]: value };
      if (orig[field] === value) delete changed[field as string];
      if (Object.keys(changed).length === 0) next.delete(id);
      else next.set(id, changed);
      const count = Array.from(next.values()).reduce((s, d) => s + Object.keys(d).length, 0);
      setDirtyCount(count);
      return next;
    });
  }

  async function saveChanges() {
    const entries = Array.from(dirtyRows.entries());
    if (!entries.length) return;
    setSavingAll(true);
    const before = new Map(entries.map(([id]) => [id, data.find((r) => r.id === id)]));
    const results = await Promise.all(
      entries.map(([id, delta]) =>
        updateConnection(id, delta).then(
          (row) => ({ id, row }),
          (err: APIError) => ({ id, err })
        )
      )
    );
    const remaining = new Map(dirtyRows);
    for (const res of results) {
      if ("row" in res) {
        setData((ds) => ds.map((r) => (r.id === res.id ? res.row : r)));
        origData.current.set(res.id, res.row);
        remaining.delete(res.id);
      } else {
        const prev = before.get(res.id);
        if (prev) setData((ds) => ds.map((r) => (r.id === res.id ? prev : r)));
        const msg = Array.isArray(res.err.detail) ? res.err.detail[0].msg : res.err.detail;
        toast.error(msg || "Error");
      }
    }
    setDirtyRows(remaining);
    const count = Array.from(remaining.values()).reduce((s, d) => s + Object.keys(d).length, 0);
    setDirtyCount(count);
    if (count === 0) toast.success("Saved");
    setSavingAll(false);
  }

  function addRow(row: Connection) {
    setData((d) => [row, ...d]);
    origData.current.set(row.id, row);
    setLastAdded(row.id);
  }

  async function handleDelete(id: number, row: Connection, index: number) {
    setData((ds) => ds.filter((r) => r.id !== id));
    try {
      await deleteConnection(id);
      origData.current.delete(id);
      setDirtyRows((map) => {
        const next = new Map(map);
        next.delete(id);
        const count = Array.from(next.values()).reduce((s, d) => s + Object.keys(d).length, 0);
        setDirtyCount(count);
        return next;
      });
      toast.success("Deleted");
    } catch (err) {
      setData((ds) => {
        const next = [...ds];
        next.splice(index, 0, row);
        return next;
      });
      const detail = (err as APIError).detail;
      const msg = Array.isArray(detail) ? detail[0].msg : detail;
      toast.error(msg || "Error deleting");
    }
  }

  const columns: ColumnDef<Connection>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, "name", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "conn_type",
      header: "Type",
      cell: ({ row, getValue }) => (
        <select
          className="border rounded px-1"
          value={getValue<string>()}
          onChange={(e) =>
            handleEdit(row.original.id, "conn_type", e.target.value as Connection["conn_type"])
          }
        >
          <option value="jdbc">jdbc</option>
          <option value="adls">adls</option>
          <option value="s3">s3</option>
          <option value="restapi">restapi</option>
        </select>
      ),
    },
    {
      accessorKey: "driver_class",
      header: "Driver Class",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string | null>() ?? ""}
          onSave={(v) => handleEdit(row.original.id, "driver_class", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "endpoint_url",
      header: "Endpoint URL",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string | null>() ?? ""}
          onSave={(v) => handleEdit(row.original.id, "endpoint_url", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "secret_scope",
      header: "Secret Scope",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string | null>() ?? ""}
          onSave={(v) => handleEdit(row.original.id, "secret_scope", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "secret_key",
      header: "Secret Key",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string | null>() ?? ""}
          onSave={(v) => handleEdit(row.original.id, "secret_key", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "options",
      header: "Options",
      cell: ({ row, getValue }) => (
        <JsonEditorCell
          initialValue={getValue<Record<string, unknown>>() ?? {}}
          onSave={(v) => handleEdit(row.original.id, "options", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated At",
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        if (!val) return <div className="text-right">&mdash;</div>;
        const date = new Date(val);
        return (
          <div className="text-right">
            {date.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
          </div>
        );
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
    <div className="p-4 flex flex-col gap-2">
      <div className="relative mb-2 sticky top-0 bg-background z-10 flex justify-center">
        <GradientText
          animationSpeed={3}
          showBorder={false}
          className="text-2xl font-bold font-display"
        >
          Connections
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
          <AddConnectionDialog onCreate={addRow} />
        </div>
      </div>
      <DataTable
        table={table}
        cellRef={(row, idx) =>
          idx === 0
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
                      setConfirmDelete(null),
                    );
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
