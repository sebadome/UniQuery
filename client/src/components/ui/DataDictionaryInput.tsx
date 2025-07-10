import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

type Entry = { key: string; description: string };

interface DataDictionaryInputProps {
  value?: string; // JSON inicial, si edita
  onChange: (jsonString: string) => void;
}

export function DataDictionaryInput({ value, onChange }: DataDictionaryInputProps) {
  const [mode, setMode] = useState<"manual" | "file">("manual");
  const [entries, setEntries] = useState<Entry[]>([{ key: "", description: "" }]);
  const [fileError, setFileError] = useState<string | null>(null);

  // Si edita, inicializa manual
  useEffect(() => {
    if (value && mode === "manual") {
      try {
        const obj = JSON.parse(value);
        if (typeof obj === "object" && obj !== null) {
          const arr = Object.entries(obj).map(([key, description]) => ({
            key,
            description: String(description),
          }));
          setEntries(arr.length > 0 ? arr : [{ key: "", description: "" }]);
        }
      } catch { }
    }
  }, [value, mode]);

  // Actualiza JSON final al padre
  useEffect(() => {
    if (mode === "manual") {
      const filtered = entries.filter(e => e.key.trim() && e.description.trim());
      if (filtered.length > 0) {
        const dict: Record<string, string> = {};
        filtered.forEach(({ key, description }) => {
          dict[key.trim()] = description.trim();
        });
        onChange(JSON.stringify(dict, null, 2));
      } else {
        onChange("");
      }
    }
    // Si file, el cambio es por handleFile
  }, [entries, mode, onChange]);

  // ---- Handlers manual ----
  const handleChange = (i: number, field: "key" | "description", value: string) => {
    setEntries(prev =>
      prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e))
    );
  };
  const handleAddRow = () => setEntries(prev => [...prev, { key: "", description: "" }]);
  const handleRemoveRow = (i: number) =>
    setEntries(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  // ---- Handlers file ----
  const handleFile = (file: File | null) => {
    setFileError(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // Busca encabezados
        let headerRowIdx = -1;
        for (let i = 0; i < rows.length; i++) {
          if (
            Array.isArray(rows[i]) &&
            rows[i].length >= 2 &&
            typeof rows[i][0] === "string" &&
            typeof rows[i][1] === "string"
          ) {
            headerRowIdx = i;
            break;
          }
        }
        if (headerRowIdx === -1) throw new Error("No se encontró encabezado válido");

        // Lee datos
        const header = rows[headerRowIdx];
        const colIdx = header.findIndex((h: string) => h.toLowerCase().includes("columna") || h.toLowerCase().includes("campo") || h.toLowerCase().includes("key"));
        const descIdx = header.findIndex((h: string) => h.toLowerCase().includes("descrip"));
        if (colIdx === -1 || descIdx === -1)
          throw new Error("El archivo debe tener columnas 'Columna' y 'Descripción'");

        const dict: Record<string, string> = {};
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[colIdx] || !row[descIdx]) continue;
          dict[String(row[colIdx]).trim()] = String(row[descIdx]).trim();
        }
        if (Object.keys(dict).length === 0)
          throw new Error("No se encontraron filas válidas");
        onChange(JSON.stringify(dict, null, 2));
      } catch (err: any) {
        setFileError(err?.message || "Archivo inválido");
        onChange("");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <label className="block font-medium mb-2">Diccionario de Datos <span className="text-xs text-muted-foreground">(opcional)</span></label>
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          className={`px-3 py-1 rounded ${mode === "manual" ? "bg-blue-100 font-bold" : "bg-slate-100"}`}
          onClick={() => setMode("manual")}
        >
          Ingresar manual
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded ${mode === "file" ? "bg-blue-100 font-bold" : "bg-slate-100"}`}
          onClick={() => setMode("file")}
        >
          Subir Excel/CSV
        </button>
      </div>
      <div className="text-xs mb-4 text-slate-600 bg-slate-50 rounded p-2">
        <b>¿Por qué agregar el diccionario?</b> Si quieres obtener respuestas más precisas, entrega al modelo el contexto de tu tabla (nombre de columna y significado). Puedes hacerlo manualmente o subiendo un archivo Excel/CSV con dos columnas: <b>Columna</b> y <b>Descripción</b>.
      </div>

      {mode === "manual" && (
        <div>
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div className="flex gap-2 mb-2" key={i}>
                <input
                  type="text"
                  className="flex-1 border rounded px-2 py-1 text-xs font-mono"
                  placeholder="Nombre de columna (ej: prdct_id)"
                  value={entry.key}
                  onChange={e => handleChange(i, "key", e.target.value)}
                  spellCheck={false}
                />
                <input
                  type="text"
                  className="flex-1 border rounded px-2 py-1 text-xs"
                  placeholder="Descripción (ej: Identificador producto)"
                  value={entry.description}
                  onChange={e => handleChange(i, "description", e.target.value)}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                  onClick={() => handleRemoveRow(i)}
                  disabled={entries.length === 1}
                  title="Eliminar fila"
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-xs px-3 py-1 bg-slate-100 rounded border hover:bg-slate-200"
            onClick={handleAddRow}
          >
            + Agregar columna
          </button>
        </div>
      )}

      {mode === "file" && (
        <div className="my-2">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={e => handleFile(e.target.files?.[0] || null)}
            className="text-xs"
          />
          <div className="text-xs text-muted-foreground mt-2">
            Sube un archivo con columnas <b>Columna</b> y <b>Descripción</b> (Excel o CSV).
          </div>
          {fileError && <div className="text-xs text-red-500">{fileError}</div>}
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-4">
        Se guardará como JSON:<br />
        <code className="block bg-slate-100 p-2 rounded overflow-x-auto max-h-32">{value || "{}"}</code>
      </div>
    </div>
  );
}
