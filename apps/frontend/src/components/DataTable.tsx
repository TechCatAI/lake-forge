"use client";

import React from "react";
import { flexRender, Row, Table, RowModel, type RowData } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsUp, ChevronsDown, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/utils";

export interface DataTableProps<T extends RowData> {
  table: Table<T>;
  stickyFirstCol?: boolean;
  cellRef?: (
    row: Row<T>,
    index: number
  ) => ((el: HTMLTableCellElement | null) => void) | undefined;
  renderRowActions?: (row: Row<T>) => React.ReactNode;
}

export default function DataTable<T extends RowData>({
  table,
  stickyFirstCol,
  cellRef,
  renderRowActions,
}: DataTableProps<T>) {
  /* helper: detect sorted‑row‑model plugin */
  function hasSortedRowModel(
    tbl: Table<T>
  ): tbl is Table<T> & { getSortedRowModel: () => RowModel<T> } {
    return (
      typeof (tbl as Table<T> & { getSortedRowModel?: () => RowModel<T> })
        .getSortedRowModel === "function"
    );
  }

  return (
    /* CHANGE: Added `h-full` and `overflow-auto`.
      - `h-full`: Makes the card fill the vertical space of its parent.
      - `overflow-auto`: Makes this card, not the page, scroll when content is too big.
    */
    <div
      className="bg-sidebar border border-sidebar-border
                 rounded-[var(--radius)] shadow-md ring-1 ring-[color:var(--border)/25]
                 p-5 backdrop-blur-sm h-full overflow-auto"
    >
      <table className="w-full table-auto text-sm border-collapse
                        border border-[color:var(--border)/60]
                        rounded-[calc(var(--radius)-2px)] overflow-hidden
                        bg-[color-mix(in_lab,var(--background),white_7%)]">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr
              key={hg.id}
              className="bg-gradient-to-b from-[color:var(--primary)] to-[color:var(--secondary)]
                         divide-x divide-[color:var(--border)/30]
                         text-[color:var(--primary-foreground)]
                         uppercase tracking-wider
                         font-semibold
                         text-sm leading-tight
                         [&>th]:py-1"
            >
              {hg.headers.map((header) => {
                if (header.isPlaceholder) return null;
                const sorted =
                  header.column.getIsSorted() as false | "asc" | "desc";
                const Icon =
                  sorted === "asc"
                    ? ChevronsUp
                    : sorted === "desc"
                    ? ChevronsDown
                    : ChevronsUpDown;
                const canSort = header.column.getCanSort();
                return (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-center whitespace-nowrap max-w-[16rem]
                               first:rounded-tl-[calc(var(--radius)-3px)]
                               last:rounded-tr-[calc(var(--radius)-3px)]"
                  >
                    {canSort ? (
                      <button
                        className="inline-flex items-center gap-1 select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <Icon className="h-3 w-3" />
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}
                  </th>
                );
              })}
              {renderRowActions && (
                <th className="font-medium px-6 py-4 text-center" />
              )}
            </tr>
          ))}
        </thead>

        <tbody className="divide-y divide-[color:var(--border)/25] dark:divide-[color:var(--border)/35]">
          <AnimatePresence initial={false}>
            {(() => {
              const rows = hasSortedRowModel(table)
                ? (table as Table<T> & {getSortedRowModel: () => RowModel<T>;
                  }
                ).getSortedRowModel().rows
                : (table as Table<T>).getCoreRowModel().rows;
              return rows;
            })().map((row: Row<T>) => (
              <motion.tr
                layout
                exit={{ opacity: 0 }}
                key={row.id}
                className="group transition-colors
                           divide-x divide-[color:var(--border)/25] dark:divide-[color:var(--border)/35]
                           hover:bg-[color:var(--primary)/8]
                           odd:bg-[color-mix(in_lab,var(--background),white_10%)]
                           even:bg-[color-mix(in_lab,var(--background),white_14%)]"
              >
                {row.getVisibleCells().map((cell, idx) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-6 py-4 text-left max-w-[16rem] break-words",
                      stickyFirstCol &&
                        idx === 0 &&
                        "sticky left-0 bg-[color:var(--card)]"
                    )}
                    ref={cellRef ? cellRef(row, idx) : undefined}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                ))}

                {renderRowActions && (
                  <td className="px-6 py-4 text-right w-8">
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