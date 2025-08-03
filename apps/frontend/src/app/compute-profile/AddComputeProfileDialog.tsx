"use client";
import { useState } from "react";
import Button from "../../components/ui/button";
import Spinner from "../../components/Spinner";
import { toast } from "sonner";
import {
  createComputeProfile,
  type ComputeProfile,
  type ComputeProfileInput,
  type APIError,
} from "../../lib/api";

interface AddPayload {
  name: string;
  description: string;
  policy_id: string;
  cluster_json: string;
  default_libraries: string;
  is_default: boolean;
}

export default function AddComputeProfileDialog({ onCreate }: { onCreate(c: ComputeProfile): void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddPayload>({
    name: "",
    description: "",
    policy_id: "",
    cluster_json: "{}",
    default_libraries: "[]",
    is_default: false,
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
      let cluster: Record<string, unknown> = {};
      let libs: Array<Record<string, unknown>> = [];
      try {
        cluster = JSON.parse(form.cluster_json);
      } catch {}
      try {
        libs = JSON.parse(form.default_libraries);
      } catch {}
      const payload: ComputeProfileInput = {
        name: form.name,
        description: form.description || null,
        policy_id: form.policy_id || null,
        cluster_json: cluster,
        default_libraries: libs,
        is_default: form.is_default,
      };
      const row = await createComputeProfile(payload);
      onCreate(row);
      toast.success("Compute profile added");
      setForm({
        name: "",
        description: "",
        policy_id: "",
        cluster_json: "{}",
        default_libraries: "[]",
        is_default: false,
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
      <Button onClick={() => setOpen(true)}>Add Compute Profile</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-96" onSubmit={submit}>
            <h2 className="font-semibold">Add Compute Profile</h2>
            <input
              className={`border w-full px-1 ${errors.name ? "border-red-500" : ""}`}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
              className="border w-full px-1"
              placeholder="Policy ID"
              value={form.policy_id}
              onChange={(e) => setForm({ ...form, policy_id: e.target.value })}
            />
            <textarea
              className="border w-full px-1 h-24"
              placeholder="{}"
              value={form.cluster_json}
              onChange={(e) => setForm({ ...form, cluster_json: e.target.value })}
            />
            <textarea
              className="border w-full px-1 h-24"
              placeholder="[]"
              value={form.default_libraries}
              onChange={(e) => setForm({ ...form, default_libraries: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <input
                id="cp-default"
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              />
              <label htmlFor="cp-default">Default</label>
            </div>
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
