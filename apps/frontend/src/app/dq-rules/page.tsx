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
import { EditableCell } from "../table-config/EditableCell";
import Button from "../../components/ui/button";
import Tooltip from "../../components/ui/tooltip";
import GradientText from "../../components/GradientText";
import AddRuleDialog from "./AddRuleDialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../../components/ui/alert-dialog";
import { Trash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchRules,
  updateRule,
  fetchTables,
  deleteRule,
  type DQRule,
  type TableConfig,
  type APIError,
} from "../../lib/api";
import { cn } from "../../lib/utils";

function SQLCell({
  value,
  onSave,
}: {
  value: string;
  onSave(v: string): void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => setVal(value), [value]);

  function save() {
    setEditing(false);
    onSave(val);
  }

  return editing ? (
    <textarea
      className="border w-60 h-24 bg-background p-1"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      autoFocus
    />
  ) : (
    <div
      className="cursor-text px-1 py-1"
      onClick={() => setEditing(true)}
    >
      {value.slice(0, 50)}
    </div>
  );
}

export default function DQRulesPage() {
  const [data, setData] = useState<DQRule[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirtyRows, setDirtyRows] = useState<Map<number, Partial<DQRule>>>(
    new Map(),
  );
  const origData = useRef<Map<number, DQRule>>(new Map());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const firstCellRefs = useRef<Record<number, HTMLTableCellElement | null>>({});
  const [lastAdded, setLastAdded] = useState<number | null>(null);

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
      const [rules, tbls] = await Promise.all([fetchRules(), fetchTables()]);
      setData(rules);
      setTables(tbls);
      origData.current = new Map(rules.map((r) => [r.id, r]));
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

  function handleEdit<K extends keyof DQRule>(
    id: number,
    field: K,
    value: DQRule[K],
  ) {
    setData((ds) => ds.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setDirtyRows((map) => {
      const next = new Map(map);
      const orig = origData.current.get(id);
      if (!orig) return next;
      const prev = next.get(id) ?? {};
      const changed = { ...prev, [field]: value };
      if (orig[field] === value) {
        delete (changed as Record<string, unknown>)[field as string];
      }
      if (Object.keys(changed).length === 0) next.delete(id);
      else next.set(id, changed);
      const count = Array.from(next.values()).reduce(
        (sum, d) => sum + Object.keys(d).length,
        0,
      );
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
        updateRule(id, delta).then(
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
        const msg = Array.isArray(res.err.detail)
          ? res.err.detail[0].msg
          : res.err.detail;
        toast.error(msg || "Error");
      }
    }
    setDirtyRows(remaining);
    const count = Array.from(remaining.values()).reduce(
      (sum, d) => sum + Object.keys(d).length,
      0,
    );
    setDirtyCount(count);
    if (count === 0) toast.success("Saved");
    setSavingAll(false);
  }

  function addRow(row: DQRule) {
    setData((d) => [row, ...d]);
    origData.current.set(row.id, row);
    setLastAdded(row.id);
  }

  function handleDelete(id: number) {
    const prev = data.find((r) => r.id === id);
    if (!prev) return;
    setData((ds) => ds.filter((r) => r.id !== id));
    deleteRule(id).then(
      () => {
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
      },
      (err: APIError) => {
        setData((ds) => [prev, ...ds]);
        const msg = Array.isArray(err.detail) ? err.detail[0].msg : err.detail;
        toast.error(msg || "Error");
      },
    );
  }

  const idToEnabled = new Map(tables.map((t) => [t.id, t.is_enabled]));

  const columns: ColumnDef<DQRule>[] = [
    {
      header: "Table Name",
      accessorKey: "fqtn",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Tooltip content={getValue<string>()}>
          <span className="truncate">{getValue<string>()}</span>
        </Tooltip>
      ),
    },
    {
      accessorKey: "table_config_id",
      header: "Enabled",
      cell: ({ getValue }) => {
        const enabled = idToEnabled.get(getValue<number>());
        return (
          <div className="text-center">{enabled ? "✓" : ""}</div>
        );
      },
    },
    {
      accessorKey: "rule_name",
      header: "Rule Name",
      cell: ({ row, getValue }) => (
        <EditableCell
          initialValue={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, "rule_name", v)}
          className="text-left"
        />
      ),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row, getValue }) => (
        <select
          className="border rounded px-1"
          defaultValue={getValue<string>()}
          onChange={(e) =>
            handleEdit(
              row.original.id,
              "severity",
              e.target.value as DQRule["severity"],
            )
          }
        >
          <option value="warn">warn</option>
          <option value="fail">fail</option>
          <option value="drop">drop</option>
        </select>
      ),
    },
    {
      accessorKey: "rule_sql",
      header: "SQL",
      cell: ({ row, getValue }) => (
        <SQLCell
          value={getValue<string>()}
          onSave={(v) => handleEdit(row.original.id, "rule_sql", v)}
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
            {date.toLocaleString("en-US", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </div>
        );
      },
    },
    {
      id: "delete",
      header: "",
      cell: ({ row }) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Trash className="h-4 w-4 text-red-500 cursor-pointer opacity-0 group-hover:opacity-100" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>Delete row?</AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button>Cancel</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button onClick={() => handleDelete(row.original.id)}>Delete</Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
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
        <GradientText
          colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
          animationSpeed={3}
          showBorder={false}
          className="text-2xl font-bold font-display"
        >
          DQ Rules
        </GradientText>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <Button onClick={saveChanges} disabled={savingAll}>
              {savingAll && (
                <span className="h-4 w-4 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              Save changes ({dirtyCount})
            </Button>
          )}
          <AddRuleDialog onCreate={addRow} />
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
          <AnimatePresence>
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
                  className={cn(
                    'border px-2',
                    idx === 0 && 'sticky left-0 bg-surface',
                  )}
                  ref={
                    idx === 2
                      ? (el) => {
                          firstCellRefs.current[row.original.id] = el;
                        }
                      : undefined
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
