import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDatabaseContext } from '@/contexts/DatabaseContext';
import { databaseApi } from '@/lib/databaseApi';
import {
  Loader2, CheckCircle, XCircle, Eye, EyeOff, Info, PlugZap, Trash2, Power, Plus, MinusCircle, FileUp
} from 'lucide-react';

// --- VALIDACIÓN FORMULARIO (Zod) ---
const dbConnectionSchema = z.object({
  name: z.string().min(1, 'El nombre de conexión es requerido'),
  type: z.string().min(1, 'El tipo de base de datos es requerido'),
  host: z.string().min(1, 'El host es requerido'),
  port: z.number().min(1, 'El puerto debe ser un número positivo'),
  database: z.string().min(1, 'El nombre de la base de datos es requerido'),
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type DbConnectionFormData = z.infer<typeof dbConnectionSchema>;
type DataDictRow = { id: string; column: string; description: string };
type DictMode = "none" | "manual" | "file";

// --- COMPONENTES AUXILIARES ---
function DataDictManualEditor({
  dataDictRows,
  setDataDictRows,
  dictError,
}: {
  dataDictRows: DataDictRow[];
  setDataDictRows: React.Dispatch<React.SetStateAction<DataDictRow[]>>;
  dictError: string | null;
}) {
  return (
    <div>
      <Label>
        Diccionario de Datos <span className="text-xs text-muted-foreground">(opcional)</span>
      </Label>
      <div className="flex flex-col gap-2">
        {dataDictRows.map((row, idx) => (
          <div key={row.id} className="flex gap-2 items-center">
            <Input
              placeholder="Columna"
              value={row.column}
              className="w-1/3 font-mono"
              onChange={e => {
                setDataDictRows(rows => {
                  const next = rows.slice();
                  const i = next.findIndex(r => r.id === row.id);
                  if (i !== -1) next[i] = { ...next[i], column: e.target.value };
                  return next;
                });
              }}
            />
            <Input
              placeholder="Descripción"
              value={row.description}
              className="flex-1 font-mono"
              onChange={e => {
                setDataDictRows(rows => {
                  const next = rows.slice();
                  const i = next.findIndex(r => r.id === row.id);
                  if (i !== -1) next[i] = { ...next[i], description: e.target.value };
                  return next;
                });
              }}
            />
            <button
              type="button"
              className="text-destructive p-1"
              title="Eliminar campo"
              onClick={() => {
                setDataDictRows(rows => rows.filter(r => r.id !== row.id));
              }}
            >
              <MinusCircle size={18} />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit mt-1"
          onClick={() =>
            setDataDictRows(rows => [...rows, { id: nanoid(), column: "", description: "" }])
          }
        >
          <Plus size={16} className="mr-2" />
          Agregar campo
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          Ejemplo: <code>{"cod_prod - Código producto"}</code>, <code>{"fecha_crtn - Fecha de creación"}</code>
        </p>
        {dictError && (
          <p className="text-sm text-destructive">{dictError}</p>
        )}
      </div>
    </div>
  );
}

function DataDictFilePreview({
  fileRows,
  onRemove,
}: {
  fileRows: DataDictRow[];
  onRemove: () => void;
}) {
  return (
    <div>
      <Label>
        Diccionario de Datos <span className="text-xs text-muted-foreground">(desde archivo)</span>
      </Label>
      <div className="flex flex-col gap-2 mt-2 mb-2">
        {fileRows.length === 0 && <p className="text-sm text-muted-foreground">No se encontraron filas válidas en el archivo.</p>}
        {fileRows.map(row => (
          <div key={row.id} className="flex gap-3 items-center bg-muted/40 rounded px-2 py-1">
            <span className="w-1/3 font-mono">{row.column}</span>
            <span className="flex-1 font-mono text-muted-foreground">{row.description}</span>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit mt-1"
        onClick={onRemove}
      >
        Cambiar archivo
      </Button>
      <p className="text-xs text-muted-foreground mt-2">
        Si necesitas modificar algún campo, cambia el archivo.
      </p>
    </div>
  );
}

// --- SCRIPT PRINCIPAL ---
export function DatabaseConnection() {
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [dictMode, setDictMode] = useState<DictMode>("none");
  const [dataDictRows, setDataDictRows] = useState<DataDictRow[]>([]);
  const [dictError, setDictError] = useState<string | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tablesError, setTablesError] = useState<string | null>(null);

  const {
    connections,
    activeConnection,
    isConnected,
    refreshConnections,
    testConnection,
    createConnection,
    activateConnection,
    deactivateConnection,
    removeConnection,
  } = useDatabaseContext();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<DbConnectionFormData>({
      resolver: zodResolver(dbConnectionSchema),
      defaultValues: {
        name: '',
        type: '',
        host: '',
        port: 5432,
        database: '',
        username: '',
        password: '',
      },
    });

  const watchedType = watch('type');

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  // --- Validación diccionario manual ---
  useEffect(() => {
    if (dictMode !== "manual") {
      setDictError(null);
      return;
    }
    if (!dataDictRows.length) {
      setDictError(null);
      return;
    }
    const hasEmpty = dataDictRows.some(row => row.column.trim() === "");
    if (hasEmpty) {
      setDictError("No puedes dejar columnas vacías en el diccionario.");
      return;
    }
    // Validar duplicados
    const seen = new Set();
    for (const row of dataDictRows) {
      if (seen.has(row.column.trim())) {
        setDictError("No puedes repetir columnas en el diccionario.");
        return;
      }
      seen.add(row.column.trim());
    }
    setDictError(null);
  }, [dataDictRows, dictMode]);

  // --- Carga de tablas solo después de probar conexión ---
  const fetchTables = async (params: DbConnectionFormData) => {
    setTablesError(null);
    setAvailableTables([]);
    setSelectedTable('');
    try {
      const resp = await databaseApi.getTablesFromParams(params);
      let tables = [];
      if (Array.isArray(resp)) {
        tables = resp;
      } else if (resp && Array.isArray(resp.tables)) {
        tables = resp.tables;
      }
      setAvailableTables(tables);
      if (!tables.length) {
        setTablesError("No se encontraron tablas en la base de datos.");
      }
    } catch (err: any) {
      setTablesError(err.message || "No se pudieron obtener las tablas.");
    }
  };

  // --- Archivo diccionario ---
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      let workbook;
      try {
        workbook = XLSX.read(data, { type: "binary" });
      } catch (err) {
        setDictError("No se pudo leer el archivo, asegúrate que sea Excel o CSV válido.");
        setDataDictRows([]);
        setDictMode("none");
        return;
      }
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1, blankrows: false });
      const sanitized = json
        .filter((row: any) => Array.isArray(row) && row.some((cell: any) => !!(cell && String(cell).trim())));
      if (!sanitized.length || !Array.isArray(sanitized[0]) || sanitized[0].length < 2) {
        setDictError("El archivo está vacío o la cabecera es inválida. Debe tener al menos dos columnas: 'Columna' y 'Descripción'.");
        setDataDictRows([]);
        setDictMode("none");
        return;
      }
      const headerRow = (sanitized[0] as any[]).map(h =>
        (typeof h === 'string' ? h : (h ? String(h) : '')).toLowerCase()
      );
      const colIdx = headerRow.findIndex(h => typeof h === 'string' && h.includes("columna"));
      const descIdx = headerRow.findIndex(h => typeof h === 'string' && h.includes("desc"));
      if (colIdx === -1 || descIdx === -1) {
        setDictError("El archivo debe tener columnas 'Columna' y 'Descripción' en la primera fila.");
        setDataDictRows([]);
        setDictMode("none");
        return;
      }
      const rows: DataDictRow[] = [];
      for (let i = 1; i < sanitized.length; i++) {
        const row = sanitized[i];
        if (!row[colIdx]) continue;
        rows.push({
          id: nanoid(),
          column: String(row[colIdx]).trim(),
          description: String(row[descIdx] ?? '').trim(),
        });
      }
      if (rows.length === 0) {
        setDictError("El archivo no contiene filas válidas.");
        setDataDictRows([]);
        setDictMode("none");
        return;
      }
      setDataDictRows(rows);
      setDictError(null);
      setDictMode("file");
    };
    reader.readAsBinaryString(file);
  }

  // --- Helper para payload API ---
  function toApiPayload(data: DbConnectionFormData, dataDictRows: DataDictRow[], dictMode: DictMode, selectedTable: string) {
    const { type, ...rest } = data;
    let data_dictionary: Record<string, string> | undefined = undefined;
    if (dictMode !== "none" && dataDictRows.length > 0 && dataDictRows.some(row => row.column.trim())) {
      data_dictionary = {};
      for (const row of dataDictRows) {
        if (row.column.trim()) {
          data_dictionary[row.column.trim()] = row.description.trim();
        }
      }
    }
    return {
      db_type: type,
      ...rest,
      dictionary_table: selectedTable,
      ...(data_dictionary ? { data_dictionary } : {}),
    };
  }

  // --- Test de conexión ---
  const handleTestConnection = async (data: DbConnectionFormData) => {
    setTestStatus('testing');
    setTestError(null);
    setTablesError(null);
    setAvailableTables([]);
    setSelectedTable('');
    if (dictError) {
      setTestStatus('error');
      setTestError('Completa correctamente el diccionario de datos.');
      return;
    }
    const success = await testConnection(data);
    if (success) {
      setTestStatus('success');
      await fetchTables(data);
    } else {
      setTestStatus('error');
      setTestError('Conexión fallida. Por favor verifica tus credenciales.');
    }
  };

  // --- Guardar conexión ---
  const onSubmit = async (data: DbConnectionFormData) => {
    if (dictError) return;
    if (testStatus !== 'success') {
      await handleTestConnection(data);
      return;
    }
    if (!selectedTable) {
      setTablesError("Debes seleccionar una tabla para guardar la conexión.");
      return;
    }
    setIsSaving(true);
    const apiData = toApiPayload(data, dataDictRows, dictMode, selectedTable);
    const success = await createConnection(apiData);
    setIsSaving(false);
    if (success) {
      setTestStatus('idle');
      reset();
      setDataDictRows([]);
      setDictMode("none");
      setFileName(null);
      setAvailableTables([]);
      setSelectedTable('');
      setTablesError(null);
      refreshConnections();
    }
  };

  // --- Tabla de conexiones guardadas ---
  const ConnectionsTable = () => (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Conexiones Guardadas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 px-3">Nombre</th>
                <th className="text-left py-2 px-3">Base de Datos</th>
                <th className="text-left py-2 px-3">Tipo</th>
                <th className="text-left py-2 px-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(!connections || connections.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center py-3">No hay conexiones guardadas</td>
                </tr>
              )}
              {connections && connections.map((conn) => {
                const isActive = activeConnection && activeConnection.id === conn.id;
                return (
                  <tr key={conn.id} className={isActive ? "bg-green-50" : ""}>
                    <td className="py-2 px-3">{conn.name}</td>
                    <td className="py-2 px-3">{conn.database}</td>
                    <td className="py-2 px-3 capitalize">{conn.db_type}</td>
                    <td className="py-2 px-3 flex gap-2">
                      {isActive ? (
                        <Button
                          type="button"
                          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold border border-red-300 hover:text-black focus:text-black"
                          size="sm"
                          onClick={async () => {
                            await deactivateConnection();
                          }}
                          style={{ transition: "color 0.15s, background 0.15s" }}
                        >
                          <Power className="w-4 h-4 mr-1" />
                          Desconectar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="flex-1 bg-green-200 hover:bg-green-300 text-green-900 font-bold border border-green-400 hover:text-black focus:text-black"
                          size="sm"
                          onClick={async () => {
                            await activateConnection(conn.id);
                          }}
                          style={{ transition: "color 0.15s, background 0.15s" }}
                        >
                          <PlugZap className="w-4 h-4 mr-1" />
                          Conectar
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeConnection(conn.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const dbTypes = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'sqlserver', label: 'SQL Server' },
    { value: 'oracle', label: 'Oracle' },
    { value: 'sqlite', label: 'SQLite' },
  ];

  const infoMsg = (
    <div className="text-xs rounded-lg bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 mb-3 flex gap-2 items-center">
      <Info size={16} className="text-blue-500" />
      Si quieres respuestas más precisas, proporciona el contexto de tus tablas en el diccionario de datos. 
      Puedes completarlo manualmente o importar un archivo Excel/CSV con columnas "Columna" y "Descripción".
    </div>
  );

  // --- Selector de tabla, solo si están cargadas y conexión fue exitosa ---
  const renderTableSelect = () => {
    if (testStatus !== 'success' || availableTables.length === 0) return null;
    return (
      <div className="mb-3">
        <Label>Tabla principal</Label>
        <select
          className="border rounded px-2 py-1 w-full"
          value={selectedTable}
          onChange={e => setSelectedTable(e.target.value)}
        >
          <option value="">Selecciona una tabla</option>
          {availableTables.map((table) => (
            <option key={table} value={table}>{table}</option>
          ))}
        </select>
        {tablesError && (
          <p className="text-sm text-destructive">{tablesError}</p>
        )}
      </div>
    );
  };

  // --- Modalidad de ingreso (manual/file/none) ---
  const renderDataDictArea = () => {
    if (dictMode === "manual") {
      return (
        <div className="mt-1">
          <DataDictManualEditor
            dataDictRows={dataDictRows}
            setDataDictRows={setDataDictRows}
            dictError={dictError}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => { setDataDictRows([]); setDictMode("none"); setDictError(null); }}
          >
            Cambiar método
          </Button>
        </div>
      );
    }
    if (dictMode === "file") {
      return (
        <div className="mt-1">
          <DataDictFilePreview
            fileRows={dataDictRows}
            onRemove={() => { setDataDictRows([]); setFileName(null); setDictMode("none"); setDictError(null); }}
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => { setDictMode("manual"); setDataDictRows([{ id: nanoid(), column: "", description: "" }]); setDictError(null); }}
          >
            Agregar manualmente
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex items-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp size={16} className="mr-2" />
            Importar archivo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>
        <span className="text-xs text-muted-foreground mt-1">
          Puedes elegir solo una modalidad: manual o archivo.
        </span>
        {dictError && (
          <p className="text-sm text-destructive mt-2">{dictError}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {isConnected && activeConnection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Actualmente Conectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{activeConnection.name}</p>
                <p className="text-sm text-muted-foreground">
                  {activeConnection.db_type} • {activeConnection.database}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  Activa
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de conexión */}
      <Card>
        <CardHeader>
          <CardTitle>Conexión a Base de Datos</CardTitle>
          <CardDescription>
            Conéctate a tu base de datos para comenzar a consultar con lenguaje natural
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de Conexión</Label>
                <Input
                  id="name"
                  placeholder="Ej: Conexión de Prueba"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Base de Datos</Label>
                <select
                  id="type"
                  className="border rounded px-2 py-1 w-full"
                  value={watchedType}
                  onChange={e => setValue('type', e.target.value, { shouldValidate: true })}
                >
                  <option value="">Selecciona el tipo de base de datos</option>
                  {dbTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  placeholder="localhost"
                  {...register('host')}
                />
                {errors.host && (
                  <p className="text-sm text-destructive">{errors.host.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  {...register('port', { valueAsNumber: true })}
                />
                {errors.port && (
                  <p className="text-sm text-destructive">{errors.port.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="database">Nombre de Base de Datos</Label>
                <Input
                  id="database"
                  placeholder="test_db"
                  {...register('database')}
                />
                {errors.database && (
                  <p className="text-sm text-destructive">{errors.database.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  placeholder="test_user"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="test_password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              {/* Diccionario de datos */}
              <div className="space-y-2 md:col-span-2">
                {infoMsg}
                {renderDataDictArea()}
              </div>
              {/* Selector de tabla (sólo tras test) */}
              <div className="space-y-2 md:col-span-2">
                {renderTableSelect()}
              </div>
            </div>
            {/* Estado de la conexión */}
            {testStatus !== 'idle' && (
              <Alert className={
                testStatus === 'success' ? 'border-green-200 bg-green-50' :
                  testStatus === 'error' ? 'border-red-200 bg-red-50' : ''
              }>
                <div className="flex items-center">
                  {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {testStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-600 mr-2" />}
                  {testStatus === 'error' && <XCircle className="h-4 w-4 text-red-600 mr-2" />}
                  <AlertDescription>
                    {testStatus === 'testing' && 'Probando conexión...'}
                    {testStatus === 'success' && 'Conexión exitosa! Selecciona la tabla y guarda.'}
                    {testStatus === 'error' && (testError || 'Conexión falló. Por favor verifica tus credenciales.')}
                  </AlertDescription>
                </div>
              </Alert>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleSubmit(handleTestConnection)}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Probando...
                  </>
                ) : (
                  'Probar Conexión'
                )}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={testStatus !== 'success' || isSaving || !!dictError || !selectedTable}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Conexión'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {connections && connections.length > 0 && <ConnectionsTable />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Consejos de Conexión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Asegúrate de que tu servidor de base de datos esté funcionando y sea accesible
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Verifica que la configuración del firewall permita conexiones en el puerto especificado
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Confirma que el usuario de la base de datos tenga los permisos de lectura necesarios
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Los detalles de conexión se almacenan de forma segura y solo en la memoria de sesión
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
