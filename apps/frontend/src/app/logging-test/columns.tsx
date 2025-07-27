"use client";
import { ColumnDef } from "@tanstack/react-table";

export type BatchRuns = {
  id: string
  schedule_id: number
  group_id: number
  started_at: string
  finished_at: string
  status: "running" | "success" | "failed"
  trigger_type: 'manual' | 'schedule' | 'adf' | 'api'
  batch_load_type: 'full' | 'manual' | 'integration' | 'failed'
  schedule_pipeline_id: string
  group_pipeline_id: string
  message: string
}

export const columns: ColumnDef<BatchRuns>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "schedule_id",
    header: "Schedule ID",
  },
  {
    accessorKey: "group_id",
    header: "Group ID",
  },
  {
    accessorKey: "started_at",
    header: "Started At",
  },
  {
    accessorKey: "finished_at",
    header: "Finished At",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "trigger_type",
    header: "Trigger Type",
  },
  {
    accessorKey: "batch_load_type",
    header: "Batch Load Type",
  },
  {
    accessorKey: "schedule_pipeline_id",
    header: "Schedule Pipeline ID",
  },
  {
    accessorKey: "group_pipeline_id",
    header: "Group Pipeline ID",
  },
  {
    accessorKey: "message",
    header: "Message",
  },
];