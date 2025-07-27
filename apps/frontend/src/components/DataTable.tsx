import { flexRender, Row, Table } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";
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
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = React.useState(false)
  const [fade, setFade] = React.useState(false)

  React.useEffect(() => {
    if (!wrapperRef.current) return
    const el = wrapperRef.current as HTMLDivElement
    function handle() {
      setScrolled(el.scrollLeft > 0)
      const hasOverflow = el.scrollHeight > el.clientHeight
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
      setFade(hasOverflow && !atBottom)
    }
    handle()
    el.addEventListener('scroll', handle)
    window.addEventListener('resize', handle)
    return () => {
      el.removeEventListener('scroll', handle)
      window.removeEventListener('resize', handle)
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative max-h-[70vh] overflow-auto rounded-2xl border bg-surface shadow-sm after-fade-bottom',
        fade ? 'after:opacity-100' : 'after:opacity-0'
      )}
    >
      <table className="min-w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-sidebar-primary text-sidebar-primary-foreground select-none">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-xs font-display font-semibold tracking-wide uppercase py-2 px-3 first:rounded-tl-2xl last:rounded-tr-2xl"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
              {renderRowActions && <th className="py-2 px-3" />}
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
              className="group even:bg-background/40 hover:bg-primary/5 transition-colors"
            >
              {row.getVisibleCells().map((cell, idx) => (
                <td
                  key={cell.id}
                  className={cn(
                    'border px-3 py-2',
                    stickyFirstCol &&
                      idx === 0 &&
                      'sticky left-0 bg-surface shadow-left-edge',
                    stickyFirstCol && idx === 0 && !scrolled && 'before:opacity-0'
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
    </div>
  );
}
