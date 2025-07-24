import { flexRender, Row, Table } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
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
      <thead className="sticky top-10 bg-background">
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((header) => (
              <th key={header.id} className="border px-2 text-left">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
            {renderRowActions && <th className="border px-2" />}
          </tr>
        ))}
      </thead>
      <tbody>
        <AnimatePresence initial={false}>
          {table.getRowModel().rows.map((row) => (
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
