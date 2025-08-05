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
import Switch from "../../components/ui/switch";
import Button from "../../components/ui/button";
import GradientText from "../../components/GradientText";
import AddComputeProfileDialog from "./AddComputeProfileDialog";
import DataTable from "../../components/DataTable";
import {
  fetchComputeProfiles,
  updateComputeProfile,
  deleteComputeProfile,
  type ComputeProfile,
  type APIError,
} from "../../lib/api";
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "../../components/ui/alert-dialog";

export default function ComputeProfilePage() {
  const [data, setData] = useState<ComputeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({});
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [dirtyRows, setDirtyRows] = useState<Map<number, Partial<ComputeProfile>>>(new Map());
  const origData = useRef<Map<number, ComputeProfile>>(new Map());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

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
      const rows = await fetchComputeProfiles();
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

  function handleEdit<K extends keyof ComputeProfile>(id: number, field: K, value: ComputeProfile[K]) {
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
        updateComputeProfile(id, delta).then(
          (row) => ({ id, row }),
          (err: APIError) => ({ id, err }),
        ),
      ),
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

  async function handleDelete(id: number) {
    try {
      await deleteComputeProfile(id);
      setData((ds) => ds.filter((r) => r.id !== id));
      origData.current.delete(id);
      setDirtyRows((map) => {
        const next = new Map(map);
        next.delete(id);
        return next;
      });
      toast.success("Deleted");
    } catch (err) {
      const detail = (err as APIError).detail;
      const msg = Array.isArray(detail) ? detail[0].msg : detail;
      toast.error(msg || "Delete failed");
    }
  }

  function addRow(row: ComputeProfile) {
    setData((ds) => [...ds, row]);
    origData.current.set(row.id, row);
    setLastAdded(row.id);
  }

  const columns: ColumnDef<ComputeProfile>[] = [
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
      accessorKey: "description",
      header: "Description",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string | null>() ?? ""}
          onSave={(v) => handleEdit(row.original.id, "description", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "policy_id",
      header: "Policy ID",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string | null>() ?? ""}
          onSave={(v) => handleEdit(row.original.id, "policy_id", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "cluster_json",
      header: "Cluster JSON",
      cell: ({ row, getValue }) => (
        <JsonEditorCell
          initialValue={getValue<Record<string, unknown>>() ?? {}}
          onSave={(v) => handleEdit(row.original.id, "cluster_json", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "default_libraries",
      header: "Default Libraries",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<Array<Record<string, unknown>>>()} 
          onSave={(v) => handleEdit(row.original.id, "default_libraries", v)}
          format={(v) => JSON.stringify(v ?? [])}
          parse={(v) => {
            try {
              return JSON.parse(v);
            } catch {
              return [];
            }
          }}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "is_default",
      header: "Default",
      cell: ({ row, getValue }) => (
        <Switch
          checked={getValue<boolean>()}
          onChange={(v) => handleEdit(row.original.id, "is_default", v)}
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
        <GradientText animationSpeed={3} showBorder={false} className="text-2xl font-bold font-display">
          Compute Profiles
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
          <AddComputeProfileDialog onCreate={addRow} />
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
              onClick={() => setConfirmDelete(row.original.id)}
            />
          )}
        />
        <AlertDialog
          open={confirmDelete !== null}
          onOpenChange={(o) => !o && setConfirmDelete(null)}
        >
          {confirmDelete !== null && (
          <>
            <AlertDialogTitle>Delete row?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            <AlertDialogFooter>
              <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (confirmDelete !== null)
                      handleDelete(confirmDelete).then(() => setConfirmDelete(null));
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
