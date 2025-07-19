"use client";
import { useState } from "react";
import Button from "../../components/ui/button";
import Spinner from "../../components/Spinner";
import { toast } from "sonner";
import { createSourceSystem, type SourceSystem, type APIError } from "../../lib/api";

export interface AddPayload {
  name: string;
  server: string;
  description: string;
  type: "adls" | "databricks" | "sql" | "restapi";
}

export default function AddSourceDialog({ onCreate }: { onCreate(s: SourceSystem): void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddPayload>({
    name: "",
    server: "",
    description: "",
    type: "sql",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const valid = form.name.trim().length > 0 && form.server.trim().length > 0;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setErrors({});
    try {
      const row = await createSourceSystem(form);
      onCreate(row);
      toast.success("Source system added");
      setForm({ name: "", server: "", description: "", type: "sql" });
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
      <Button onClick={() => setOpen(true)}>Add Source</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-80" onSubmit={submit}>
            <h2 className="font-semibold">Add Source System</h2>
            <input
              className={`border w-full px-1 ${errors.name ? "border-red-500" : ""}`}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className={`border w-full px-1 ${errors.server ? "border-red-500" : ""}`}
              placeholder="Server"
              value={form.server}
              onChange={(e) => setForm({ ...form, server: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <select
              className="border w-full px-1"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as AddPayload["type"] })}
            >
              <option value="adls">adls</option>
              <option value="databricks">databricks</option>
              <option value="sql">sql</option>
              <option value="restapi">restapi</option>
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
