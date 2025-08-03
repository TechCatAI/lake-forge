"use client";
import { useState, useEffect } from "react";
import Button from "../../components/ui/button";
import Spinner from "../../components/Spinner";
import { toast } from "sonner";
import {
  createGroup,
  fetchSchedules,
  fetchComputeProfiles,
  type Group,
  type Schedule,
  type ComputeProfile,
  type APIError,
} from "../../lib/api";

export interface AddPayload {
  name: string;
  description: string;
  is_enabled: boolean;
  is_raw: boolean;
  is_bronze: boolean;
  schedule_id: number | null;
  compute_profile_id: number | null;
}

export default function AddGroupDialog({ onCreate }: { onCreate(g: Group): void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddPayload>({
    name: "",
    description: "",
    is_enabled: true,
    is_raw: false,
    is_bronze: false,
    schedule_id: null,
    compute_profile_id: null,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [profiles, setProfiles] = useState<ComputeProfile[]>([]);

  useEffect(() => {
    if (open) {
      fetchSchedules().then(setSchedules, () => setSchedules([]));
      fetchComputeProfiles().then(setProfiles, () => setProfiles([]));
    }
  }, [open]);

  const valid = form.name.trim().length > 0;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setErrors({});
    try {
      const row = await createGroup(form);
      onCreate(row);
      toast.success("Group added");
      setForm({
        name: "",
        description: "",
        is_enabled: true,
        is_raw: false,
        is_bronze: false,
        schedule_id: null,
        compute_profile_id: null,
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
      <Button onClick={() => setOpen(true)}>Add Group</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-80" onSubmit={submit}>
            <h2 className="font-semibold">Add Group</h2>
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
            <select
              className="border w-full px-1"
              value={form.schedule_id ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  schedule_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">No schedule</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.name}
                </option>
              ))}
            </select>
            <select
              className="border w-full px-1"
              value={form.compute_profile_id ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  compute_profile_id: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            >
              <option value="">No compute profile</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                id="grp-enabled"
                type="checkbox"
                checked={form.is_enabled}
                onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
              />
              <label htmlFor="grp-enabled">Enabled</label>
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
