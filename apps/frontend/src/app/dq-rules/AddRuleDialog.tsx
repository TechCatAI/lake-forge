"use client";
import { useState, useEffect } from "react";
import Button from "../../components/ui/button";
import Spinner from "../../components/Spinner";
import { toast } from "sonner";
import {
  createRule,
  fetchBronzeConfigs,
  type APIError,
  type DQRule,
  type BronzeConfig,
} from "../../lib/api";

export interface AddPayload {
  table_config_id: number;
  rule_name: string;
  rule_sql: string;
  severity: "warn" | "fail" | "drop";
  is_enabled: boolean;
}

export default function AddRuleDialog({
  onCreate,
}: {
  onCreate(row: DQRule): void;
}) {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState<BronzeConfig[]>([]);
  const [form, setForm] = useState<AddPayload>({
    table_config_id: 0,
    rule_name: "",
    rule_sql: "",
    severity: "warn",
    is_enabled: true,
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchBronzeConfigs().then(setTables, () => setTables([]));
    }
  }, [open]);

  const valid =
    form.table_config_id > 0 && form.rule_name && form.rule_sql && form.severity;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setErrors({});
    try {
      const row = await createRule(form);
      onCreate(row);
      toast.success("Rule added");
      setForm({
        table_config_id: 0,
        rule_name: "",
        rule_sql: "",
        severity: "warn",
        is_enabled: true,
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
      <Button onClick={() => setOpen(true)}>Add Rule</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-80" onSubmit={submit}>
            <h2 className="font-semibold">Add DQ Rule</h2>
            <select
              className={`border w-full px-1 ${errors.table_config_id ? "border-red-500" : ""}`}
              value={form.table_config_id}
              onChange={(e) =>
                setForm({ ...form, table_config_id: Number(e.target.value) })
              }
            >
              <option value={0}>Select table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.catalog}.{t.schema_name}.{t.table_name}
                </option>
              ))}
            </select>
            <input
              className={`border w-full px-1 ${errors.rule_name ? "border-red-500" : ""}`}
              placeholder="Rule Name"
              value={form.rule_name}
              onChange={(e) => setForm({ ...form, rule_name: e.target.value })}
            />
            <textarea
              className={`border w-full px-1 ${errors.rule_sql ? "border-red-500" : ""}`}
              placeholder="SQL"
              value={form.rule_sql}
              onChange={(e) => setForm({ ...form, rule_sql: e.target.value })}
            />
            <select
              className="border w-full px-1"
              value={form.severity}
              onChange={(e) =>
                setForm({ ...form, severity: e.target.value as AddPayload["severity"] })
              }
            >
              <option value="warn">warn</option>
              <option value="fail">fail</option>
              <option value="drop">drop</option>
            </select>
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
