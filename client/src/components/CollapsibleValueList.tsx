import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface CollapsibleValueListProps {
  values: (string | number)[];
  maxVisible?: number;
  label?: string;
}

export function CollapsibleValueList({
  values,
  maxVisible = 15,
  label = "Valores encontrados",
}: CollapsibleValueListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!Array.isArray(values) || values.length === 0) return null;

  // Mostramos solo los primeros maxVisible, o todos si expandido
  const visibleValues = expanded ? values : values.slice(0, maxVisible);

  return (
    <div className="my-2">
      <div className="text-sm font-medium mb-2">
        {label}{" "}
        <span className="text-muted-foreground">({values.length})</span>:
      </div>
      <ul className="pl-0 flex flex-wrap gap-2 text-sm max-h-[40vh] overflow-y-auto">
        {visibleValues.map((val, idx) => (
          <li
            key={typeof val === "string" || typeof val === "number" ? `${val}-${idx}` : idx}
            className="rounded bg-slate-100 px-2 py-1"
            title={typeof val === "string" ? val : String(val)}
          >
            {val}
          </li>
        ))}
      </ul>
      {values.length > maxVisible && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Ver menos" : `Ver todos (${values.length})`}
        </Button>
      )}
    </div>
  );
}
