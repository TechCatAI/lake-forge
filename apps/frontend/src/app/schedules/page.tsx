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
import Switch from '../../components/ui/switch'
import Button from "../../components/ui/button";
import GradientText from "../../components/GradientText";
import AddScheduleDialog, { WEEKDAY_OPTIONS } from "./AddScheduleDialog";
import DataTable from "../../components/DataTable";
import {
  fetchSchedules,
  updateSchedule,
  deleteSchedule,
  type Schedule,
  type APIError,
} from "../../lib/api";
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "../../components/ui/alert-dialog";

export default function SchedulesPage() {
  const [data, setData] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({});
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [dirtyRows, setDirtyRows] = useState<Map<number, Partial<Schedule>>>(new Map());
  const origData = useRef<Map<number, Schedule>>(new Map());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number;
    row: Schedule;
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
      const rows = await fetchSchedules();
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

  function handleEdit<K extends keyof Schedule>(id: number, field: K, value: Schedule[K]) {
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
        updateSchedule(id, delta).then(
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

  function addRow(row: Schedule) {
    setData((d) => [row, ...d]);
    origData.current.set(row.id, row);
    setLastAdded(row.id);
  }

  async function handleDelete(id: number, row: Schedule, index: number) {
    setData((ds) => ds.filter((r) => r.id !== id));
    try {
      await deleteSchedule(id);
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

  const columns: ColumnDef<Schedule>[] = [
    {
      accessorKey: "is_enabled",
      header: "Enabled",
      cell: ({ row, getValue }) => (
        <Switch checked={getValue<boolean>()} onChange={(v) => handleEdit(row.original.id, "is_enabled", v)} />
      ),
    },
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
      accessorKey: "month_days",
      header: "Month Days",
      cell: ({ row, getValue }) => {
        const disabled = row.original.weekdays.length > 0;
        if (disabled) {
          return <div className="text-left opacity-50">{getValue<number[]>().join(", ")}</div>;
        }
        return (
          <EditableCell<number[]>
            initialValue={getValue<number[]>()}
            onSave={(v) => {
              handleEdit(row.original.id, "month_days", v);
              if (v.length > 0) handleEdit(row.original.id, "weekdays", []);
            }}
            parse={(val) =>
              val
                .split(/[,\s]+/)
                .map((n) => Number(n))
                .filter((n) => !isNaN(n) && n >= 0 && n <= 31)
            }
            format={(val) => val.join(", ")}
            className="text-left"
          />
        );
      },
    },
    {
      accessorKey: "weekdays",
      header: "Weekdays",
      cell: ({ row, getValue }) => {
        const selected = getValue<number[]>();
        const disabled = row.original.month_days.length > 0;
        function toggleDay(d: number) {
          const weekdays = selected.includes(d)
            ? selected.filter((x) => x !== d)
            : [...selected, d];
          handleEdit(row.original.id, "weekdays", weekdays);
          if (weekdays.length > 0) handleEdit(row.original.id, "month_days", []);
        }
        return (
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_OPTIONS.map((d) => (
              <label
                key={d.value}
                className={`flex items-center gap-1 text-xs ${disabled ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected.includes(d.value)}
                  onChange={() => toggleDay(d.value)}
                />
                {d.label}
              </label>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "times",
      header: "Times",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string[]>().join(", ")}
          onSave={(v) =>
            handleEdit(
              row.original.id,
              "times",
              v
                .split(/[,\s]+/)
                .map((t) => t.trim())
                .filter((t) => /^\d{2}:\d{2}$/.test(t)),
            )
          }
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
    <div className="p-4 overflow-auto">
      <div className="relative mb-2 sticky top-0 bg-background z-10 flex justify-center">
        <GradientText
          animationSpeed={3}
          showBorder={false}
          className="text-2xl font-bold font-display"
        >
          Schedules
        </GradientText>
        <div className="absolute right-0 top-0 flex items-center gap-2">
          {dirtyCount > 0 && (
            <Button onClick={saveChanges} disabled={savingAll}>
              {savingAll && <span className="h-4 w-4 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              Save changes ({dirtyCount})
            </Button>
          )}
          <AddScheduleDialog onCreate={addRow} />
        </div>
      </div>
      <DataTable
        table={table}
        cellRef={(row, idx) =>
          idx === 1
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
                    handleDelete(confirmDelete.id, confirmDelete.row, confirmDelete.index).then(() => setConfirmDelete(null));
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
