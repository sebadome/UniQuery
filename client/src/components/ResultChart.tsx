// src/components/ResultChart.tsx
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ResultChartProps {
  columns: string[];
  rows: (string | number | null)[][];
}

/**
 * Renderiza un gráfico automáticamente usando las dos primeras columnas de la tabla.
 * Si la segunda columna no es numérica, no muestra gráfico.
 * Si la primera columna parece fecha, grafica como línea, si no como barras.
 */
export function ResultChart({ columns, rows }: ResultChartProps) {
  if (!columns || columns.length < 2 || !rows || rows.length === 0) {
    return <div className="p-4 text-muted-foreground">No hay datos suficientes para graficar.</div>;
  }

  // Extraer los datos
  const labels = rows.map((row) => (row[0] !== null && row[0] !== undefined) ? String(row[0]) : "(Sin valor)");
  const yValues = rows.map((row) => {
    const value = row[1];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") {
      // Permitir decimales con , o .
      const normalized = value.replace(",", ".");
      const parsed = Number(normalized);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  });

  // Verificar que hay al menos dos datos numéricos válidos
  if (yValues.filter((v) => typeof v === "number" && !isNaN(v)).length < 2) {
    return (
      <div className="p-4 text-muted-foreground">
        No se puede graficar porque los valores de <b>{columns[1]}</b> no son numéricos o hay muy pocos datos.
      </div>
    );
  }

  // Chequeo simple: si la primera columna son fechas, grafica como línea
  const isDate = (v: string) =>
    /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{2}\/\d{2}\/\d{4}/.test(v);
  const useLine = labels.length > 0 && labels.every(isDate);

  const data = {
    labels,
    datasets: [
      {
        label: columns[1],
        data: yValues,
        backgroundColor: 'rgba(59,130,246,0.6)',
        borderColor: 'rgba(37,99,235,1)',
        borderWidth: 2,
        fill: false,
        tension: 0.25,
        // Puedes agregar aquí más estilos si lo deseas
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: `${columns[1]} por ${columns[0]}`,
      },
    },
    scales: {
      x: { ticks: { autoSkip: true, maxTicksLimit: 20 } },
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="bg-white rounded-xl p-4 my-3 shadow">
      {useLine ? (
        <Line data={data} options={options} />
      ) : (
        <Bar data={data} options={options} />
      )}
    </div>
  );
}
