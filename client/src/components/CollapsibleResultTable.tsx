import React, { useState } from "react";
import { Button } from "@/components/ui/button";

// Utilitario para exportar a CSV
function exportToCsv(columns: string[], rows: (string | number | null)[][], filename = "resultados.csv") {
  const csvRows = [
    columns.join(","),
    ...rows.map(row =>
      row.map(cell =>
        cell === null || cell === undefined
          ? ""
          : (typeof cell === "string" && cell.includes(","))
            ? `"${cell.replace(/"/g, '""')}"`
            : String(cell)
      ).join(",")
    )
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utilitario para exportar a Excel (XLSX)
// Necesitas instalar: npm i xlsx
import * as XLSX from "xlsx";
function exportToExcel(columns: string[], rows: (string | number | null)[][], filename = "resultados.xlsx") {
  const data = [columns, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
  XLSX.writeFile(workbook, filename);
}

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

  if (!Array.isArray(rows) || rows.length === 0 || !Array.isArray(columns) || columns.length === 0) {
    return null;
  }

  const visibleRows = expanded ? rows : rows.slice(0, maxVisible);

  return (
    <div className="my-2 w-full">
      <div className="text-sm font-medium mb-2">
        {label} ({rows.length} fila{rows.length !== 1 && "s"})
      </div>

      {/* Botones de exportar */}
      <div className="mb-2 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCsv(columns, rows)}
        >
          Exportar CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToExcel(columns, rows)}
        >
          Exportar Excel
        </Button>
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
                    {cell === null || typeof cell === "undefined" ? (
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
