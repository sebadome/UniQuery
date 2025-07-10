// client/src/components/DatabaseConnectionsTable.tsx

import { useState } from "react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash, Plug2, PlugZap, BookOpen } from 'lucide-react';

type Props = {
  connections: any[]; // Mejor usar DatabaseConnection[] si tienes el tipo
  activeConnectionId?: string | null;
  onActivate: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
};

export function DatabaseConnectionsTable({
  connections,
  activeConnectionId,
  onActivate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  const openModal = (dataDict: any) => {
    if (!dataDict || (typeof dataDict === "string" && dataDict.trim().length === 0)) {
      setModalContent("No hay diccionario de datos para esta conexión.");
    } else {
      // Admite: objeto (recomendado), stringifiable JSON, o string plano
      let toShow: React.ReactNode = null;
      if (typeof dataDict === "object") {
        toShow = (
          <pre className="whitespace-pre-wrap text-xs bg-slate-900 text-white rounded-lg p-4">
            {JSON.stringify(dataDict, null, 2)}
          </pre>
        );
      } else if (typeof dataDict === "string") {
        try {
          const parsed = JSON.parse(dataDict);
          toShow = (
            <pre className="whitespace-pre-wrap text-xs bg-slate-900 text-white rounded-lg p-4">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          );
        } catch {
          toShow = (
            <pre className="whitespace-pre-wrap text-xs bg-slate-900 text-white rounded-lg p-4">
              {dataDict}
            </pre>
          );
        }
      }
      setModalContent(toShow);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
  };

  if (!connections?.length) {
    return <div className="text-sm text-muted-foreground p-4">No tienes conexiones guardadas.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded-xl shadow bg-white dark:bg-slate-900">
        <thead>
          <tr className="bg-muted/60">
            <th className="px-4 py-2 text-left font-semibold">Nombre</th>
            <th className="px-4 py-2 text-left font-semibold">Base de Datos</th>
            <th className="px-4 py-2 text-left font-semibold">Tipo</th>
            <th className="px-4 py-2 text-left font-semibold">Host</th>
            <th className="px-4 py-2 text-left font-semibold">Puerto</th>
            <th className="px-4 py-2 text-left font-semibold">Diccionario de Datos</th>
            <th className="px-4 py-2 text-left font-semibold">Estado</th>
            <th className="px-4 py-2 text-left font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((conn) => (
            <tr
              key={conn.id}
              className={activeConnectionId === conn.id ? "bg-green-50 dark:bg-green-900/40" : ""}
            >
              <td className="px-4 py-2">{conn.name}</td>
              <td className="px-4 py-2">{conn.database}</td>
              <td className="px-4 py-2 capitalize">{conn.db_type}</td>
              <td className="px-4 py-2">{conn.host}</td>
              <td className="px-4 py-2">{conn.port}</td>
              <td className="px-4 py-2">
                {(conn.data_dictionary && (
                  (typeof conn.data_dictionary === "object" && Object.keys(conn.data_dictionary).length > 0) ||
                  (typeof conn.data_dictionary === "string" && conn.data_dictionary.length > 0)
                )) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex gap-1 items-center"
                    onClick={() => openModal(conn.data_dictionary)}
                  >
                    <BookOpen className="h-4 w-4" />
                    Ver
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-2">
                {activeConnectionId === conn.id ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Activa
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactiva</Badge>
                )}
              </td>
              <td className="px-4 py-2 flex gap-2">
                {activeConnectionId !== conn.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex gap-1 items-center"
                    onClick={() => onActivate(conn.id)}
                  >
                    <Plug2 className="h-4 w-4" />
                    Conectar
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex gap-1 items-center"
                  onClick={() => onDelete(conn.id)}
                >
                  <Trash className="h-4 w-4" />
                  Eliminar
                </Button>
                {activeConnectionId === conn.id && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex gap-1 items-center"
                    disabled
                  >
                    <PlugZap className="h-4 w-4" />
                    Conectada
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* MODAL PARA VER EL DICCIONARIO DE DATOS */}
      {showModal && (
        <div
          className="fixed z-50 inset-0 bg-black/40 flex items-center justify-center"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-lg min-w-[300px]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Diccionario de Datos</h2>
            {modalContent}
            <div className="flex justify-end mt-6">
              <Button onClick={closeModal}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
