import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, MinusCircle } from "lucide-react";
import { nanoid } from "nanoid";

type DataDictRow = { id: string; column: string; description: string };

export default function TestDataDict() {
  const [rows, setRows] = useState<DataDictRow[]>([]);

  return (
    <div className="max-w-lg mx-auto mt-10 space-y-4">
      <h3 className="font-bold mb-2">Diccionario de Datos (DEMO)</h3>
      {rows.map((row, idx) => (
        <div key={row.id} className="flex gap-2">
          <Input
            placeholder="Columna"
            value={row.column}
            onChange={e => {
              const next = rows.slice();
              next[idx] = { ...next[idx], column: e.target.value };
              setRows(next);
            }}
          />
          <Input
            placeholder="Descripción"
            value={row.description}
            onChange={e => {
              const next = rows.slice();
              next[idx] = { ...next[idx], description: e.target.value };
              setRows(next);
            }}
          />
          <Button type="button" variant="outline" onClick={() => setRows(rows => rows.filter(r => r.id !== row.id))}>
            <MinusCircle size={18} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows(rows => [...rows, { id: nanoid(), column: "", description: "" }])}
      >
        <Plus size={16} className="mr-2" />
        Agregar campo
      </Button>
    </div>
  );
}
