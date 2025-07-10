import { useState, useMemo } from "react";
import {
  Bar, Line, Pie, Doughnut, Scatter
} from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend, ArcElement, Filler
} from "chart.js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Maximize2, X } from "lucide-react";

const chartThumbnails: Record<string, JSX.Element> = {
  bar:   <svg width="34" height="18"><rect x="3" y="8" width="3" height="7" fill="#60a5fa"/><rect x="10" y="4" width="3" height="11" fill="#60a5fa"/><rect x="17" y="1" width="3" height="14" fill="#60a5fa"/><rect x="24" y="11" width="3" height="4" fill="#60a5fa"/></svg>,
  line:  <svg width="34" height="18"><polyline points="3,15 10,12 17,4 24,10" fill="none" stroke="#34d399" strokeWidth="2"/><circle cx="3" cy="15" r="1.5" fill="#34d399"/><circle cx="10" cy="12" r="1.5" fill="#34d399"/><circle cx="17" cy="4" r="1.5" fill="#34d399"/><circle cx="24" cy="10" r="1.5" fill="#34d399"/></svg>,
  area:  <svg width="34" height="18"><polygon points="3,15 10,12 17,4 24,10 24,17 3,17" fill="#c7d2fe"/><polyline points="3,15 10,12 17,4 24,10" fill="none" stroke="#6366f1" strokeWidth="2"/></svg>,
  pie:   <svg width="18" height="18"><circle cx="9" cy="9" r="7" fill="#fbbf24"/><path d="M9 2 A7 7 0 0 1 16 9 L9 9 Z" fill="#60a5fa"/></svg>,
  doughnut: <svg width="18" height="18"><circle cx="9" cy="9" r="7" fill="#e0e7ff"/><circle cx="9" cy="9" r="4" fill="#fff"/><path d="M9 2 A7 7 0 0 1 16 9 L13 9 A4 4 0 0 0 9 5 Z" fill="#6366f1"/></svg>,
  scatter: <svg width="34" height="18"><circle cx="5" cy="14" r="2" fill="#f43f5e"/><circle cx="14" cy="7" r="2" fill="#f43f5e"/><circle cx="25" cy="12" r="2" fill="#f43f5e"/><circle cx="30" cy="5" r="2" fill="#f43f5e"/></svg>,
};

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, ChartTooltip, Legend, ArcElement, Filler
);

type ChartType = "bar" | "line" | "area" | "pie" | "doughnut" | "scatter";

interface ResultChartProps {
  columns: string[];
  rows: (string | number | null)[][];
  height?: number; // opcional: para usar más grande en el modal
}

function isNumeric(value: any) {
  if (typeof value === "number") return true;
  if (typeof value === "string") {
    const v = value.replace(/,/g, ".");
    return !isNaN(Number(v));
  }
  return false;
}
function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value);
}

const colorPalette = [
  "#4F46E5", "#10B981", "#F59E42", "#EF4444", "#6366F1",
  "#FBBF24", "#14B8A6", "#D946EF", "#F43F5E", "#A3E635",
  "#3B82F6", "#0EA5E9", "#E11D48", "#7C3AED", "#65A30D"
];

function suggestChartType({
  xCol, yCols, columns, rows,
}: {
  xCol: string,
  yCols: string[],
  columns: string[],
  rows: (string | number | null)[][]
}): ChartType {
  const xIdx = columns.indexOf(xCol);
  const yIdxs = yCols.map(col => columns.indexOf(col));
  const labels = rows.map(r => r[xIdx]);
  const yVals = rows.map(r => yIdxs.map(yi => r[yi]));

  if (yCols.length === 1) {
    if (labels.every(l => l && isDate(String(l))) && yVals.every(ys => isNumeric(ys[0]))) return "line";
    if (labels.length <= 8 && yVals.every(ys => isNumeric(ys[0]))) return "pie";
    if (isNumeric(rows[0]?.[xIdx]) && isNumeric(rows[0]?.[yIdxs[0]])) return "scatter";
    if (labels.every(l => typeof l === "string" && !isDate(String(l)))) return "bar";
    return "bar";
  }
  if (yCols.length > 1) {
    if (labels.every(l => l && isDate(String(l)))) return "line";
    return "bar";
  }
  return "bar";
}

const recommendedData: Record<ChartType, string> = {
  bar: "Categorías (texto) vs. valores numéricos",
  line: "Fechas (serie temporal) vs. valores numéricos",
  area: "Fechas vs. valores numéricos (área bajo curva)",
  pie: "Pocas categorías y valores numéricos",
  doughnut: "Pocas categorías y valores numéricos",
  scatter: "Dos variables numéricas (XY)"
};

function getSuggestionReason(type: ChartType, xCol: string, yCols: string[], labels: any[], yVals: any[][]) {
  if (type === "line" && yCols.length === 1) return "Se sugiere gráfico de líneas porque el eje X parece una serie temporal (fechas).";
  if (type === "bar" && yCols.length === 1) return "Se sugiere gráfico de barras porque el eje X es categórico y el eje Y es numérico.";
  if ((type === "pie" || type === "doughnut") && yCols.length === 1) return "Se sugiere gráfico de torta/donut porque hay pocos valores distintos y todos son numéricos.";
  if (type === "scatter" && yCols.length === 1) return "Se sugiere gráfico de dispersión porque ambos ejes seleccionados son numéricos.";
  if (type === "line" && yCols.length > 1) return "Se sugiere gráfico de líneas múltiples para comparar varias variables numéricas por fechas.";
  if (type === "bar" && yCols.length > 1) return "Se sugiere gráfico de barras agrupadas para comparar varias variables numéricas por categoría.";
  return "Gráfico sugerido en base a los datos.";
}

export function ResultChart({ columns, rows, height = 320 }: ResultChartProps) {
  // --- Maximizar Modal ---
  const [showModal, setShowModal] = useState(false);

  // Validaciones iniciales
  if (!columns || columns.length < 2 || !rows || rows.length === 0) {
    return <div className="p-4 text-muted-foreground">No hay datos suficientes para graficar.</div>;
  }

  const numericCols = columns.filter((_, colIdx) =>
    rows.some((r) => isNumeric(r[colIdx]))
  );
  const defaultX = columns.find((col, i) =>
    rows.every((r) => typeof r[i] === "string" || isDate(String(r[i])))
  ) || columns[0];
  const defaultYs = numericCols.length ? [numericCols[0]] : [columns[1]];
  const [xCol, setXCol] = useState(defaultX);
  const [yCols, setYCols] = useState<string[]>(defaultYs);
  const xIdx = columns.indexOf(xCol);
  const yIdxs = yCols.map(yc => columns.indexOf(yc));

  const suggestedType = useMemo(
    () => suggestChartType({ xCol, yCols, columns, rows }),
    [xCol, yCols, columns, rows]
  );
  const [chartType, setChartType] = useState<ChartType | null>(null);
  const actualType = chartType ?? suggestedType;

  const labels = rows.map(row =>
    row[xIdx] !== null && row[xIdx] !== undefined ? String(row[xIdx]) : "(Sin valor)"
  );
  const yValues = yIdxs.map((yIdx) =>
    rows.map(row => {
      const value = row[yIdx];
      if (typeof value === "number") return value;
      if (typeof value === "string" && value !== "") {
        const parsed = Number(value.replace(/,/g, "."));
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    })
  );

  if (yValues.flat().filter((v) => typeof v === "number" && !isNaN(v)).length < 2) {
    return (
      <div className="p-4 text-muted-foreground">
        No se puede graficar porque los valores de <b>{yCols.join(", ")}</b> no son numéricos o hay muy pocos datos.
      </div>
    );
  }

  const datasets = yCols.map((yCol, i) => ({
    label: yCol,
    data: yValues[i],
    backgroundColor: colorPalette[i % colorPalette.length],
    borderColor: colorPalette[i % colorPalette.length],
    borderWidth: 2,
    fill: actualType === 'area',
    tension: 0.25,
    pointRadius: 4,
  }));

  const data = { labels, datasets };
  const pieData = {
    labels,
    datasets: [{
      data: yValues[0],
      backgroundColor: colorPalette.slice(0, labels.length)
    }]
  };
  const scatterData = {
    datasets: [{
      label: `${yCols[0]} vs ${xCol}`,
      data: rows.map(r => ({
        x: isNumeric(r[xIdx]) ? Number(r[xIdx]) : null,
        y: isNumeric(r[yIdxs[0]]) ? Number(r[yIdxs[0]]) : null,
      })),
      backgroundColor: colorPalette[0]
    }]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: `${yCols.join(", ")} por ${xCol}`,
      },
    },
    scales: {
      x: { ticks: { autoSkip: true, maxTicksLimit: 20 } },
      y: { beginAtZero: true },
    },
  };

  function isChartTypeEnabled(type: ChartType) {
    if ((type === "pie" || type === "doughnut") && (
      yCols.length !== 1 ||
      labels.length > 15 ||
      yValues[0].filter((v) => typeof v === "number" && !isNaN(v)).length < 2
    )) return false;
    if (type === "scatter" && (
      yCols.length !== 1 ||
      !isNumeric(rows[0]?.[xIdx]) ||
      !isNumeric(rows[0]?.[yIdxs[0]])
    )) return false;
    if (type === "line" && !labels.every(isDate)) return false;
    if (type === "area" && !labels.every(isDate)) return false;
    if (type === "bar" && yCols.length >= 1) return true;
    return true;
  }

  function handleYColChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setYCols(selected.length > 0 ? selected : [numericCols[0] || columns[1]]);
    setChartType(null);
  }

  // --- UI: Interactividad profesional + botón maximizar ---
  return (
    <>
      <div className="bg-white rounded-xl p-4 my-3 shadow relative">
        {/* Maximizar */}
        <button
          type="button"
          aria-label="Maximizar gráfico"
          className="absolute top-3 right-3 p-1 rounded-full bg-slate-100 hover:bg-slate-200"
          onClick={() => setShowModal(true)}
        >
          <Maximize2 className="h-4 w-4 text-slate-600" />
        </button>
        <TooltipProvider>
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <label className="text-sm">Eje X:</label>
            <select
              value={xCol}
              onChange={e => { setXCol(e.target.value); setChartType(null); }}
              className="border px-2 py-1 rounded"
            >
              {columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            <label className="text-sm ml-2">Eje Y:</label>
            <select
              value={yCols}
              onChange={handleYColChange}
              className="border px-2 py-1 rounded"
              multiple
              size={Math.min(4, numericCols.length)}
              style={{ minWidth: 120 }}
            >
              {numericCols.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            <label className="text-sm ml-2">Tipo de gráfico:</label>
            <div className="flex gap-1">
              {(["bar", "line", "area", "pie", "doughnut", "scatter"] as ChartType[]).map(type => (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!isChartTypeEnabled(type)}
                      onClick={() => setChartType(type)}
                      className={`border px-1 py-1 rounded bg-white flex flex-col items-center justify-center
                        ${actualType === type ? "ring-2 ring-blue-400" : ""}
                        ${!isChartTypeEnabled(type) ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100"}`}
                    >
                      {chartThumbnails[type]}
                      <span className="text-[10px]">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="text-xs capitalize font-semibold mb-1">
                      {type === "bar" && "Comparar valores por categoría"}
                      {type === "line" && "Evolución temporal o tendencia"}
                      {type === "area" && "Evolución temporal (área bajo la curva)"}
                      {type === "pie" && "Proporción o porcentaje del total"}
                      {type === "doughnut" && "Proporción tipo doughnut"}
                      {type === "scatter" && "Relación entre dos variables numéricas"}
                    </div>
                    <div className="text-xs mb-1">
                      <b>Tipo de datos recomendado:</b> {recommendedData[type]}
                    </div>
                    {!isChartTypeEnabled(type) && (
                      <div className="mt-1 text-xs text-orange-700">
                        No disponible para la selección actual.
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-pointer text-xs text-blue-700 underline">
                  (¿Por qué sugerido?)
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="text-xs">{getSuggestionReason(actualType, xCol, yCols, labels, yValues)}</div>
              </TooltipContent>
            </Tooltip>
            <span className="ml-2 text-xs text-muted-foreground">
              ({actualType === suggestedType ? "sugerido" : "personalizado"})
            </span>
          </div>
        </TooltipProvider>
        <div style={{ height }}>
          {actualType === "bar" && <Bar data={data} options={options} />}
          {actualType === "line" && <Line data={data} options={options} />}
          {actualType === "area" && <Line data={{ ...data, datasets: datasets.map(d => ({ ...d, fill: true })) }} options={options} />}
          {actualType === "pie" && yCols.length === 1 && <Pie data={pieData} />}
          {actualType === "doughnut" && yCols.length === 1 && <Doughnut data={pieData} />}
          {actualType === "scatter" && yCols.length === 1 && <Scatter data={scatterData} options={options} />}
          {actualType === "scatter" && yCols.length > 1 && (
            <div className="p-2 text-sm text-orange-700">
              El gráfico de dispersión solo soporta una variable Y.
            </div>
          )}
        </div>
      </div>

      {/* Modal Maximizado */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[98vw] w-[900px] md:w-[1200px] p-6">
          <DialogHeader className="flex flex-row justify-between items-center">
            <DialogTitle>Gráfico en grande</DialogTitle>
            <button
              className="ml-auto rounded-full hover:bg-slate-200 p-1"
              onClick={() => setShowModal(false)}
              aria-label="Cerrar"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>
          <div className="pt-2">
            <ResultChart
              columns={columns}
              rows={rows}
              height={600}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
