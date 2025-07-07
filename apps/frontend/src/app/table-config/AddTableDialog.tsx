"use client";
import { useState } from "react";
import Button from "../../components/ui/button";
import Spinner from "../../components/Spinner";
import { toast } from "sonner";
import { createTable, type TableConfig, type APIError } from "../../lib/api";

export interface AddPayload {
  source_system: string;
  catalog: string;
  schema_name: string;
  table_name: string;
  source_path: string;
  load_type: "full" | "incremental";
  pk_columns: string;
}

export default function AddTableDialog({
  onCreate,
}: {
  onCreate(row: TableConfig): void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddPayload>({
    source_system: "",
    catalog: "",
    schema_name: "",
    table_name: "",
    source_path: "",
    load_type: "full",
    pk_columns: "",
  });

  const valid =
    form.source_system &&
    form.catalog &&
    form.schema_name &&
    form.table_name &&
    form.source_path &&
    form.pk_columns;

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setErrors({});
    try {
      const row = await createTable({
        ...form,
        pk_columns: form.pk_columns
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        source_kind: "volume",
        is_enabled: true,
        file_format: null,
        connection_id: null,
        ingest_options: {},
      });
      onCreate(row);
      toast.success("Table Config added");
      setForm({
        source_system: "",
        catalog: "",
        schema_name: "",
        table_name: "",
        source_path: "",
        load_type: "full",
        pk_columns: "",
      });
      setOpen(false);
    } catch (err) {
      const error = err as APIError & { detail?: unknown };
      if (Array.isArray(error.detail)) {
        const map: Record<string, string> = {};
        for (const d of error.detail as Array<{ loc: string[]; msg: string }>) {
          const field = d.loc[d.loc.length - 1];
          map[field] = d.msg;
        }
        setErrors(map);
      }
      toast.error(typeof error.detail === "string" ? error.detail : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Add Table Config</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-80" onSubmit={submit}>
            <h2 className="font-semibold">Add Table Config</h2>
            <input
              className={`border w-full px-1 ${errors.source_system ? "border-red-500" : ""}`}
              placeholder="Source System"
              value={form.source_system}
              onChange={(e) =>
                setForm({ ...form, source_system: e.target.value })
              }
            />
            <input
              className={`border w-full px-1 ${errors.catalog ? "border-red-500" : ""}`}
              placeholder="Catalog"
              value={form.catalog}
              onChange={(e) => setForm({ ...form, catalog: e.target.value })}
            />
            <input
              className={`border w-full px-1 ${errors.schema_name ? "border-red-500" : ""}`}
              placeholder="Schema"
              value={form.schema_name}
              onChange={(e) =>
                setForm({ ...form, schema_name: e.target.value })
              }
            />
            <input
              className={`border w-full px-1 ${errors.table_name ? "border-red-500" : ""}`}
              placeholder="Table Name"
              value={form.table_name}
              onChange={(e) => setForm({ ...form, table_name: e.target.value })}
            />
            <input
              className={`border w-full px-1 ${errors.source_path ? "border-red-500" : ""}`}
              placeholder="Source Path"
              value={form.source_path}
              onChange={(e) =>
                setForm({ ...form, source_path: e.target.value })
              }
            />
            <select
              className={`border w-full px-1 ${errors.pk_columns ? "border-red-500" : ""}`}
              value={form.load_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  load_type: e.target.value as "full" | "incremental",
                })
              }
            >
              <option value="full">full</option>
              <option value="incremental">incremental</option>
            </select>
            <input
              className="border w-full px-1"
              placeholder="PK Columns"
              value={form.pk_columns}
              onChange={(e) => setForm({ ...form, pk_columns: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!valid || saving}>
                {saving ? <Spinner className="h-4 w-4" /> : "Create"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
