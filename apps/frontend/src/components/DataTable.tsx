import { flexRender, Row, Table } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import "./table.css";

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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [, setScroll] = useState(0)

  useEffect(() => {
    if (!wrapperRef.current) return
    const el = wrapperRef.current!
    const handleScroll = () => {
      const scrolled = el.scrollLeft > 0 ? "1" : "0"
      if (el.dataset.scrollLeft !== scrolled) {
        el.dataset.scrollLeft = scrolled
        setScroll(el.scrollLeft)
      }
    }
    handleScroll()
    el.addEventListener("scroll", handleScroll)
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="relative max-h-[70vh] overflow-auto rounded-2xl border bg-surface shadow-sm after-fade-bottom"
    >
      <table className="min-w-full text-sm border-collapse w-full">
        <thead className="sticky top-0 z-10 bg-sidebar-primary text-sidebar-primary-foreground select-none">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <th
                    key={header.id}
                    className="text-xs font-display font-semibold tracking-wide uppercase py-2 px-3 first:rounded-tl-2xl last:rounded-tr-2xl text-left"
                    onClick={header.column.getToggleSortingHandler()}
                    {...(header.column.getCanSort()
                      ? { role: "button", tabIndex: 0 }
                      : {})}
                  >
                    <div className="flex items-center gap-1 group">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      <ChevronsUpDown
                        className={cn(
                          "h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100",
                          sorted && "opacity-100",
                          sorted === "desc" && "rotate-180"
                        )}
                      />
                    </div>
                  </th>
                )
              })}
              {renderRowActions && (
                <th className="py-2 px-3 text-xs font-display font-semibold tracking-wide uppercase text-left" />
              )}
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
                      "px-3 py-2",
                      stickyFirstCol &&
                        idx === 0 &&
                        "sticky left-0 bg-surface shadow-left-edge"
                    )}
                    ref={cellRef ? cellRef(row, idx) : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                {renderRowActions && (
                  <td className="px-3 py-2 text-right w-8">
                    {renderRowActions(row)}
                  </td>
                )}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}
