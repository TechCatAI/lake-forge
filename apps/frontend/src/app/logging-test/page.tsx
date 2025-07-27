"use client"
import { columns, BatchRuns } from "./columns"
import { DataTable } from "./data-table"
// import DataTable from '../../components/DataTable'

const batch: BatchRuns[] = [
  {
    id: "728ed52f",
    schedule_id: 123,
    group_id: 456,
    started_at: "2023-10-01T12:00:00Z",
    finished_at: "2023-10-01T12:30:00Z",
    status: "running",
    trigger_type: 'manual',
    batch_load_type: 'full',
    schedule_pipeline_id: "pipeline_123",
    group_pipeline_id: "pipeline_456",
    message: "Batch run is currently in progress",
  },
  {
    id: "489e1d42",
    schedule_id: 125,
    group_id: 457,
    started_at: "2023-10-01T12:00:00Z",
    finished_at: "2023-10-01T12:30:00Z",
    status: "failed",
    trigger_type: 'manual',
    batch_load_type: 'full',
    schedule_pipeline_id: "pipeline_456",
    group_pipeline_id: "pipeline_789",
    message: "Batch run has failed",
  },
]

async function getData(): Promise<BatchRuns[]> {
    // Simulating a data fetch, replace with actual data fetching logic
    return batch; // Use the batch data defined in columns.tsx
}

export default async function LoggingTestPage() {
    const data = await getData()

    return (
        <div className="container mx-auto py-10">
            <DataTable columns={columns} data={data} />
        </div>
    )
}