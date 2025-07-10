import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface CollapsibleResultTableProps {
  columns: string[];
  rows: (string | number | null)[][];
  maxVisible?: number;
  label?: string;
}

export function CollapsibleResultTable({
  columns,
  rows,
  maxVisible = 15,
  label = "Resultados",
}: CollapsibleResultTableProps) {
  const [expanded, setExpanded] = useState(false);

  if (!rows?.length || !columns?.length) return null;

  const visibleRows = expanded ? rows : rows.slice(0, maxVisible);

  return (
    <div className="my-2 w-full">
      <div className="text-sm font-medium mb-2">
        {label} ({rows.length} fila{rows.length !== 1 && "s"})
      </div>
      <div className="overflow-x-auto border rounded bg-white">
        <table className="min-w-full text-sm">
          <caption className="sr-only">
            {label} - Vista tabular de resultados
          </caption>
          <thead className="bg-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="py-2 px-3 text-left font-semibold whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rIdx) => (
              <tr
                key={`row-${rIdx}`}
                className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                {row.map((cell, cIdx) => (
                  <td key={`cell-${rIdx}-${cIdx}`} className="py-1 px-3">
                    {cell === null ? (
                      <span className="text-slate-400 italic">null</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > maxVisible && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Ver menos" : `Ver todas (${rows.length})`}
        </Button>
      )}
    </div>
  );
}
