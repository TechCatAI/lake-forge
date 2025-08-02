"use client";
import { useState } from "react";
import Button from "../../components/ui/button";
import Spinner from "../../components/Spinner";
import { toast } from "sonner";
import { createConnection, type Connection, type APIError } from "../../lib/api";

export interface AddPayload {
  name: string;
  conn_type: "jdbc" | "adls" | "s3" | "restapi";
  driver_class: string;
  endpoint_url: string;
  secret_scope: string;
  secret_key: string;
  options: string;
}

export default function AddConnectionDialog({ onCreate }: { onCreate(c: Connection): void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddPayload>({
    name: "",
    conn_type: "jdbc",
    driver_class: "",
    endpoint_url: "",
    secret_scope: "",
    secret_key: "",
    options: "{}",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const valid = form.name.trim().length > 0;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        name: form.name,
        conn_type: form.conn_type as AddPayload["conn_type"],
        driver_class: form.driver_class || null,
        endpoint_url: form.endpoint_url || null,
        secret_scope: form.secret_scope || null,
        secret_key: form.secret_key || null,
        options: (() => {
          try {
            return JSON.parse(form.options || "{}");
          } catch {
            return {};
          }
        })(),
      };
      const row = await createConnection(payload);
      onCreate(row);
      toast.success("Connection added");
      setForm({
        name: "",
        conn_type: "jdbc",
        driver_class: "",
        endpoint_url: "",
        secret_scope: "",
        secret_key: "",
        options: "{}",
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
      <Button onClick={() => setOpen(true)}>Add Connection</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-96" onSubmit={submit}>
            <h2 className="font-semibold">Add Connection</h2>
            <input
              className={`border w-full px-1 ${errors.name ? "border-red-500" : ""}`}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="border w-full px-1"
              value={form.conn_type}
              onChange={(e) =>
                setForm({ ...form, conn_type: e.target.value as AddPayload["conn_type"] })
              }
            >
              <option value="jdbc">jdbc</option>
              <option value="adls">adls</option>
              <option value="s3">s3</option>
              <option value="restapi">restapi</option>
            </select>
            <input
              className="border w-full px-1"
              placeholder="Driver Class"
              value={form.driver_class}
              onChange={(e) => setForm({ ...form, driver_class: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Endpoint URL"
              value={form.endpoint_url}
              onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Secret Scope"
              value={form.secret_scope}
              onChange={(e) => setForm({ ...form, secret_scope: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Secret Key"
              value={form.secret_key}
              onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder='{"key":"value"}'
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
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
