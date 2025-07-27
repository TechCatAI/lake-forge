import { flexRender, Row, Table } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsUp, ChevronsDown, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/utils";

export interface DataTableProps<T> {
  table: Table<T>;
  stickyFirstCol?: boolean;
  cellRef?: (
    row: Row<T>,
    index: number
  ) => ((el: HTMLTableCellElement | null) => void) | undefined;
  renderRowActions?: (row: Row<T>) => React.ReactNode;
}

export default function DataTable<T>({
  table,
  stickyFirstCol,
  cellRef,
  renderRowActions,
}: DataTableProps<T>) {
  return (
    <table className="min-w-full text-sm border-collapse">
      <thead className="sticky top-10 bg-foreground">
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((header) => {
              if (header.isPlaceholder) return null;
              const sorted = header.column.getIsSorted() as false | 'asc' | 'desc';
              const Icon =
                sorted === 'asc'
                  ? ChevronsUp
                  : sorted === 'desc'
                    ? ChevronsDown
                    : ChevronsUpDown;
              return (
                <th key={header.id} className="border px-2 text-left">
                  <button
                    className="flex items-center gap-1 select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <Icon className="h-3 w-3" />
                  </button>
                </th>
              );
            })}
            {renderRowActions && <th className="border px-2" />}
          </tr>
        ))}
      </thead>
      <tbody>
        <AnimatePresence initial={false}>
          {(
            'getSortedRowModel' in table && typeof (table as any).getSortedRowModel === 'function'
              ? (table as any).getSortedRowModel()
              : table.getRowModel()
          ).rows.map((row: Row<T>) => (
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
                    "border px-2",
                    stickyFirstCol && idx === 0 && "sticky left-0 bg-surface"
                  )}
                  ref={cellRef ? cellRef(row, idx) : undefined}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
              {renderRowActions && (
                <td className="border px-2 text-right w-8">
                  {renderRowActions(row)}
                </td>
              )}
            </motion.tr>
          ))}
        </AnimatePresence>
      </tbody>
    </table>
  );
}
