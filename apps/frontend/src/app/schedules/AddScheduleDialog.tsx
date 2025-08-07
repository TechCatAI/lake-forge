"use client";
import { useState } from "react";
import Button from "../../components/ui/button";
import Spinner from "../../components/Spinner";
import { toast } from "sonner";
import { createSchedule, type Schedule, type APIError } from "../../lib/api";

export const WEEKDAY_OPTIONS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

export interface AddPayload {
  name: string;
  description: string;
  month_days: string;
  weekdays: number[];
  times: string;
  is_enabled: boolean;
}

export default function AddScheduleDialog({ onCreate }: { onCreate(s: Schedule): void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddPayload>({
    name: "",
    description: "",
    month_days: "",
    weekdays: [],
    times: "",
    is_enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const valid =
    form.name.trim().length > 0 &&
    /^[0-9:, ]*$/.test(form.times) &&
    /^[0-9lL, ]*$/.test(form.month_days);

  function parseTimes(): string[] {
    return form.times
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter((t) => t && /^\d{2}:\d{2}$/.test(t));
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setErrors({});
    try {
      const monthDays = form.month_days
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(
          (s) =>
            s &&
            (s === "L" || (/^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 31)),
        );
      const row = await createSchedule({
        name: form.name,
        description: form.description || null,
        month_days: monthDays,
        weekdays: monthDays.length ? [] : [...form.weekdays].sort((a, b) => a - b),
        times: parseTimes(),
        is_enabled: form.is_enabled,
      });
      onCreate(row);
      toast.success("Schedule added");
      setForm({ name: "", description: "", month_days: "", weekdays: [], times: "", is_enabled: true });
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

  function toggleWeekday(d: number) {
    setForm((f) => {
      const weekdays = f.weekdays.includes(d)
        ? f.weekdays.filter((x) => x !== d)
        : [...f.weekdays, d];
      return { ...f, weekdays };
    });
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Add Schedule</Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <form className="bg-background p-4 space-y-2 w-80" onSubmit={submit}>
            <h2 className="font-semibold">Add Schedule</h2>
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
            <div className="flex flex-wrap gap-1">
              {WEEKDAY_OPTIONS.map((d) => (
                <label key={d.value} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    disabled={form.month_days.trim().length > 0}
                    checked={form.weekdays.includes(d.value)}
                    onChange={() => toggleWeekday(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
            <input
              className="border w-full px-1"
              placeholder="Month days e.g. 1,15,L"
              title="1-31 or L = last day"
              value={form.month_days}
              onChange={(e) => setForm({ ...form, month_days: e.target.value })}
              disabled={form.weekdays.length > 0}
            />
            <input
              className={`border w-full px-1 ${errors.times ? "border-red-500" : ""}`}
              placeholder="HH:MM, HH:MM"
              value={form.times}
              onChange={(e) => setForm({ ...form, times: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <input
                id="sch-enabled"
                type="checkbox"
                checked={form.is_enabled}
                onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
              />
              <label htmlFor="sch-enabled">Enabled</label>
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
