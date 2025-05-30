import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDatabase } from '@/hooks/use-database';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, Info } from 'lucide-react';

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

export function DatabaseConnection() {
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const { testConnection, connect, disconnect, isConnected, activeConnection } = useDatabase();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<DbConnectionFormData>({
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

  // Set default ports based on database type
  const handleTypeChange = (type: string) => {
    setValue('type', type);
    const defaultPorts: Record<string, number> = {
      postgresql: 5432,
      mysql: 3306,
      sqlserver: 1433,
      oracle: 1521,
      sqlite: 0,
    };
    if (defaultPorts[type]) {
      setValue('port', defaultPorts[type]);
    }
  };

  const handleTestConnection = async (data: DbConnectionFormData) => {
    setTestStatus('testing');
    setTestError(null);
    
    const success = await testConnection(data);
    
    if (success) {
      setTestStatus('success');
    } else {
      setTestStatus('error');
      setTestError('Connection test failed');
    }
  };

  const onSubmit = async (data: DbConnectionFormData) => {
    // Test connection first if not already tested
    if (testStatus !== 'success') {
      await handleTestConnection(data);
      return;
    }

    setIsConnecting(true);
    const success = await connect(data);
    setIsConnecting(false);

    if (success) {
      // Reset form on successful connection
      setTestStatus('idle');
    }
  };

  const dbTypes = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'sqlserver', label: 'SQL Server' },
    { value: 'oracle', label: 'Oracle' },
    { value: 'sqlite', label: 'SQLite' },
  ];

  return (
    <div className="space-y-6">
      {/* Current Connection Status */}
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
                  {activeConnection.type} • {activeConnection.database}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  Activa
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => disconnect(activeConnection.id)}
                  disabled={isConnecting}
                >
                  Desconectar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Form */}
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
                  placeholder="Mi Base de Datos"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Base de Datos</Label>
                <Select onValueChange={handleTypeChange} value={watchedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de base de datos" />
                  </SelectTrigger>
                  <SelectContent>
                    {dbTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  placeholder="my_database"
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
                  placeholder="postgres"
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
                    placeholder="••••••••"
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
            </div>

            {/* Connection Status */}
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
                    {testStatus === 'success' && 'Conexión exitosa! Listo para conectar.'}
                    {testStatus === 'error' && (testError || 'Conexión falló. Por favor verifica tus credenciales.')}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Action Buttons */}
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
                disabled={testStatus !== 'success' || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  'Guardar y Conectar'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Connection Tips */}
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
