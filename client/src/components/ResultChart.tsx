import { useState, useMemo, useRef, useEffect } from "react";
import {
  Bar, Line, Pie, Doughnut, Scatter
} from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend, ArcElement, Filler
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Maximize2, X, Download } from "lucide-react";

// --- Configuración ChartJS ---
ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, ChartTooltip, Legend, ArcElement, Filler,
  ChartDataLabels
);

// Iconos para los tipos de gráfico
const chartThumbnails = {
  bar:   <svg width="34" height="18"><rect x="3" y="8" width="3" height="7" fill="#60a5fa"/><rect x="10" y="4" width="3" height="11" fill="#60a5fa"/><rect x="17" y="1" width="3" height="14" fill="#60a5fa"/><rect x="24" y="11" width="3" height="4" fill="#60a5fa"/></svg>,
  line:  <svg width="34" height="18"><polyline points="3,15 10,12 17,4 24,10" fill="none" stroke="#34d399" strokeWidth="2"/><circle cx="3" cy="15" r="1.5" fill="#34d399"/><circle cx="10" cy="12" r="1.5" fill="#34d399"/><circle cx="17" cy="4" r="1.5" fill="#34d399"/><circle cx="24" cy="10" r="1.5" fill="#34d399"/></svg>,
  area:  <svg width="34" height="18"><polygon points="3,15 10,12 17,4 24,10 24,17 3,17" fill="#c7d2fe"/><polyline points="3,15 10,12 17,4 24,10" fill="none" stroke="#6366f1" strokeWidth="2"/></svg>,
  pie:   <svg width="18" height="18"><circle cx="9" cy="9" r="7" fill="#fbbf24"/><path d="M9 2 A7 7 0 0 1 16 9 L9 9 Z" fill="#60a5fa"/></svg>,
  doughnut: <svg width="18" height="18"><circle cx="9" cy="9" r="7" fill="#e0e7ff"/><circle cx="9" cy="9" r="4" fill="#fff"/><path d="M9 2 A7 7 0 0 1 16 9 L13 9 A4 4 0 0 0 9 5 Z" fill="#6366f1"/></svg>,
  scatter: <svg width="34" height="18"><circle cx="5" cy="14" r="2" fill="#f43f5e"/><circle cx="14" cy="7" r="2" fill="#f43f5e"/><circle cx="25" cy="12" r="2" fill="#f43f5e"/><circle cx="30" cy="5" r="2" fill="#f43f5e"/></svg>,
};

const colorPalette = [
  "#4F46E5", "#10B981", "#F59E42", "#EF4444", "#6366F1",
  "#FBBF24", "#14B8A6", "#D946EF", "#F43F5E", "#A3E635",
  "#3B82F6", "#0EA5E9", "#E11D48", "#7C3AED", "#65A30D"
];

function isNumeric(value) {
  if (typeof value === "number") return true;
  if (typeof value === "string") {
    const v = value.replace(/,/g, ".");
    return !isNaN(Number(v));
  }
  return false;
}
function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value);
}

// --- NUEVO: Detección de tabla "no graficable" (por ejemplo: solo columnas tipo diccionario de datos) ---
function isMetadataTable(columns) {
  // Ejemplo típico: ["column_name", "data_type"] o ["Field", "Type"]
  if (!columns || columns.length < 2) return false;
  const names = columns.map(c => c.toLowerCase());
  // Puedes agregar más patrones si tienes otras variantes
  return (
    (names.includes("column_name") && names.includes("data_type")) ||
    (names.includes("field") && names.includes("type")) ||
    (names.includes("nombre_columna") && names.includes("tipo_dato"))
  );
}

function suggestChartType({ xCol, yCols, columns, rows }) {
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

const recommendedData = {
  bar: "Categorías (texto) vs. valores numéricos",
  line: "Fechas (serie temporal) vs. valores numéricos",
  area: "Fechas vs. valores numéricos (área bajo curva)",
  pie: "Pocas categorías y valores numéricos",
  doughnut: "Pocas categorías y valores numéricos",
  scatter: "Dos variables numéricas (XY)"
};

function getSuggestionReason(type, xCol, yCols, labels, yVals) {
  if (type === "line" && yCols.length === 1) return "Se sugiere gráfico de líneas porque el eje X parece una serie temporal (fechas).";
  if (type === "bar" && yCols.length === 1) return "Se sugiere gráfico de barras porque el eje X es categórico y el eje Y es numérico.";
  if ((type === "pie" || type === "doughnut") && yCols.length === 1) return "Se sugiere gráfico de torta/donut porque hay pocos valores distintos y todos son numéricos.";
  if (type === "scatter" && yCols.length === 1) return "Se sugiere gráfico de dispersión porque ambos ejes seleccionados son numéricos.";
  if (type === "line" && yCols.length > 1) return "Se sugiere gráfico de líneas múltiples para comparar varias variables numéricas por fechas.";
  if (type === "bar" && yCols.length > 1) return "Se sugiere gráfico de barras agrupadas para comparar varias variables numéricas por categoría.";
  return "Gráfico sugerido en base a los datos.";
}

function exportChartAsImage(chartRef, type = "png", filename = "grafico") {
  if (chartRef?.current) {
    const base64 = chartRef.current.toBase64Image(type === "jpeg" ? "image/jpeg" : "image/png", 1.0);
    const link = document.createElement("a");
    link.href = base64;
    link.download = `${filename}.${type}`;
    link.click();
  }
}

function MultiSelectDropdown({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const toggleAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options);
    }
  };
  return (
    <div className="relative" style={{ minWidth: 220 }}>
      <button
        type="button"
        className="border px-2 py-1 rounded w-full text-left bg-white"
        onClick={() => setOpen(v => !v)}
      >
        {selected.length === 0
          ? "Selecciona categorías..."
          : `${selected.length} categorías seleccionadas`}
        <span className="float-right ml-2">&#9660;</span>
      </button>
      {open && (
        <div
          className="absolute z-50 bg-white border rounded shadow-md mt-1 max-h-60 overflow-auto"
          style={{ minWidth: 200 }}
        >
          <div className="px-2 py-1 border-b">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.length === options.length}
                onChange={toggleAll}
              />
              <span className="text-sm font-semibold">
                {selected.length === options.length ? "Deseleccionar todo" : "Seleccionar todo"}
              </span>
            </label>
          </div>
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => {
                  if (selected.includes(opt)) {
                    onChange(selected.filter(v => v !== opt));
                  } else {
                    onChange([...selected, opt]);
                  }
                }}
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export function ResultChart({ columns, rows, height = 320 }) {
  const [showModal, setShowModal] = useState(false);
  const chartRef = useRef(null);

  // --- Detección de columnas numéricas ---
  const numericCols = useMemo(() =>
    columns.filter((_, colIdx) =>
      rows.some((r) => isNumeric(r[colIdx]))
    ), [columns, rows]
  );
  const defaultX = useMemo(() =>
    columns.find((col, i) =>
      rows.every((r) => typeof r[i] === "string" || isDate(String(r[i])))
    ) || columns[0], [columns, rows]
  );
  const defaultYs = useMemo(() =>
    numericCols.length ? [numericCols[0]] : [columns[1]], [numericCols, columns]
  );

  const [xCol, setXCol] = useState(defaultX);
  const [yCols, setYCols] = useState(defaultYs);
  const [showDataLabels, setShowDataLabels] = useState(true);

  // Multi-categoría para Eje X
  const xIdx = columns.indexOf(xCol);
  const categoryOptions = useMemo(() =>
    Array.from(new Set(rows.map(r => r[xIdx]).filter(Boolean).map(String)))
  , [rows, xIdx]);
  const [categoryFilter, setCategoryFilter] = useState(categoryOptions);

  useEffect(() => {
    setCategoryFilter(categoryOptions);
  }, [xCol, rows, xIdx]);

  // --- Solo muestra los labels seleccionados ---
  const filteredRows = useMemo(() =>
    rows.filter(r => categoryFilter.includes(r[xIdx]?.toString() ?? "")), [rows, categoryFilter, xIdx]
  );
  const labels = useMemo(() =>
    filteredRows.map(row =>
      row[xIdx] !== null && row[xIdx] !== undefined ? String(row[xIdx]) : "(Sin valor)"
    ), [filteredRows, xIdx]
  );
  const yIdxs = yCols.map(yc => columns.indexOf(yc));
  const yValues = yIdxs.map((yIdx) =>
    filteredRows.map(row => {
      const value = row[yIdx];
      if (typeof value === "number") return value;
      if (typeof value === "string" && value !== "") {
        const parsed = Number(value.replace(/,/g, "."));
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    })
  );

  const suggestedType = useMemo(
    () => suggestChartType({ xCol, yCols, columns, rows }),
    [xCol, yCols, columns, rows]
  );
  const [chartType, setChartType] = useState(null);
  const actualType = chartType ?? suggestedType;

  // --- Layout gráfico: SIEMPRE scroll local ---
  const MIN_WIDTH_PER_LABEL = 75;
  const chartAreaWidth = Math.max(700, labels.length * MIN_WIDTH_PER_LABEL);

  const datasets = yCols.map((yCol, i) => ({
    label: yCol,
    data: yValues[i],
    backgroundColor: colorPalette[i % colorPalette.length],
    borderColor: colorPalette[i % colorPalette.length],
    borderWidth: 2,
    barThickness: Math.max(8, 40 - Math.floor(labels.length / 8) * 5),
    fill: actualType === 'area',
    tension: 0.25,
    pointRadius: 4,
    datalabels: {
      display: showDataLabels,
      anchor: actualType === "bar" ? "end" : "center",
      align: actualType === "bar" ? "end" : "center",
      color: "#222",
      font: { weight: "bold" },
      formatter: (value) => (typeof value === "number" ? value : ""),
    }
  }));

  // Pie & doughnut labels
  function pieLabelFormatter(value, context) {
    const total = context.chart.data.datasets[0].data.reduce(
      (acc, curr) => acc + (typeof curr === "number" ? curr : 0), 0
    );
    if (!showDataLabels) return "";
    if (total === 0) return "0";
    const percent = Math.round((value / total) * 100);
    return `${percent}%\n${value}`;
  }

  const data = { labels, datasets };
  const pieData = {
    labels,
    datasets: [{
      data: yValues[0],
      backgroundColor: colorPalette.slice(0, labels.length),
      datalabels: {
        display: showDataLabels,
        color: "#222",
        font: { weight: "bold" },
        align: "center",
        anchor: "center",
        formatter: pieLabelFormatter
      }
    }]
  };
  const scatterData = {
    datasets: [{
      label: `${yCols[0]} vs ${xCol}`,
      data: filteredRows.map(r => ({
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
      legend: { position: 'top' },
      title: {
        display: true,
        text: `${yCols.join(", ")} por ${xCol}`,
      },
      datalabels: {
        display: showDataLabels,
        color: "#222",
        font: { weight: "bold" }
      }
    },
    scales: {
      x: { ticks: { autoSkip: false } },
      y: { beginAtZero: true },
    },
  };

  function isChartTypeEnabled(type) {
    if ((type === "pie" || type === "doughnut") && (
      yCols.length !== 1 ||
      labels.length > 15 ||
      yValues[0].filter((v) => typeof v === "number" && !isNaN(v)).length < 2
    )) return false;
    if (type === "scatter" && (
      yCols.length !== 1 ||
      !isNumeric(filteredRows[0]?.[xIdx]) ||
      !isNumeric(filteredRows[0]?.[yIdxs[0]])
    )) return false;
    if (type === "line" && !labels.every(isDate)) return false;
    if (type === "area" && !labels.every(isDate)) return false;
    if (type === "bar" && yCols.length >= 1) return true;
    return true;
  }

  function handleYColChange(e) {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setYCols(selected.length > 0 ? selected : [numericCols[0] || columns[1]]);
    setChartType(null);
  }

  // --- Panel de selección y gráfico ---
  function ChartPanel() {
    // --- Nuevo: Mensaje para tablas no graficables (metadata, estructura, o sin datos numéricos) ---
    if (isMetadataTable(columns)) {
      return (
        <div className="p-4 text-muted-foreground flex flex-col gap-2" style={{ background: "white" }}>
          <b>No es posible graficar la estructura de la tabla.</b>
          <div>
            Esta vista muestra solo información descriptiva (nombre de columna y tipo de dato), por lo que no tiene valores numéricos para graficar.<br />
            <span className="text-xs">
              Si deseas ver un gráfico, consulta datos que incluyan valores numéricos,<br />
              por ejemplo: <i>"¿Cuántos registros hay por zona?"</i> o <i>"Kilos exportados por semana"</i>.
            </span>
          </div>
        </div>
      );
    }

    // --- Mensaje por defecto para casos sin datos suficientes ---
    const notEnoughData = (
      <div className="p-4 text-muted-foreground flex flex-col gap-2" style={{ background: "white" }}>
        <b>No se puede graficar con los datos actuales.</b>
        <div>
          Debes tener al menos 2 categorías y valores numéricos para generar un gráfico.<br />
          <span className="text-xs">
            Prueba consultando agregaciones, conteos o resúmenes por categoría para obtener resultados gráficos.
          </span>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          Usa el <b>scroll horizontal</b> si hay muchas categorías.<br />
          <b>Arrastra</b> para moverte.<br />
          Haz <b>doble click</b> para resetear el zoom.
        </div>
      </div>
    );

    // --- Panel habitual de gráfico ---
    return (
      <>
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
            <span className="ml-2 text-sm">Filtrar categorías:</span>
            <MultiSelectDropdown
              options={categoryOptions}
              selected={categoryFilter}
              onChange={setCategoryFilter}
            />
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
              {Object.keys(chartThumbnails).map(type => (
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
            {/* Checkbox para mostrar/ocultar etiquetas */}
            <label className="flex items-center ml-4 gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={showDataLabels}
                onChange={e => setShowDataLabels(e.target.checked)}
              />
              Mostrar etiquetas de datos
            </label>
            <button
              type="button"
              aria-label="Exportar gráfico"
              className="ml-4 p-1 rounded-full bg-slate-100 hover:bg-slate-200"
              onClick={() => exportChartAsImage(chartRef, "png")}
            >
              <Download className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </TooltipProvider>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <div style={{
            width: chartAreaWidth,
            minWidth: chartAreaWidth,
            height,
            paddingBottom: 8,
            background: "white",
            transition: "min-width 0.2s"
          }}>
            {(labels.length > 1 && yValues.flat().filter((v) => typeof v === "number" && !isNaN(v)).length >= 2) ? (
              <>
                {actualType === "bar" && <Bar ref={chartRef} data={data} options={options} plugins={[ChartDataLabels]} />}
                {actualType === "line" && <Line ref={chartRef} data={data} options={options} plugins={[ChartDataLabels]} />}
                {actualType === "area" && <Line ref={chartRef} data={{ ...data, datasets: datasets.map(d => ({ ...d, fill: true })) }} options={options} plugins={[ChartDataLabels]} />}
                {actualType === "pie" && yCols.length === 1 && <Pie ref={chartRef} data={pieData} options={options} plugins={[ChartDataLabels]} />}
                {actualType === "doughnut" && yCols.length === 1 && <Doughnut ref={chartRef} data={pieData} options={options} plugins={[ChartDataLabels]} />}
                {actualType === "scatter" && yCols.length === 1 && <Scatter ref={chartRef} data={scatterData} options={options} />}
                {actualType === "scatter" && yCols.length > 1 && (
                  <div className="p-2 text-sm text-orange-700">
                    El gráfico de dispersión solo soporta una variable Y.
                  </div>
                )}
              </>
            ) : (
              notEnoughData
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl p-4 my-3 shadow relative">
        <button
          type="button"
          aria-label="Maximizar gráfico"
          className="absolute top-3 right-3 p-1 rounded-full bg-slate-100 hover:bg-slate-200"
          onClick={() => setShowModal(true)}
        >
          <Maximize2 className="h-4 w-4 text-slate-600" />
        </button>
        <ChartPanel />
      </div>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[99vw] w-[99vw] md:w-[1400px] p-6" style={{ background: "white" }}>
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
          <div className="pt-2 w-full overflow-x-auto">
            <div style={{
              minWidth: chartAreaWidth,
              minHeight: "55vh",
              maxHeight: "80vh",
            }}>
              <ChartPanel />
              <div className="text-xs text-slate-500 pt-2 text-center">
                Usa el <b>scroll horizontal</b> si hay muchas categorías.<br />
                <b>Arrastra</b> para moverte.<br />
                Haz <b>doble click</b> para resetear el zoom.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
