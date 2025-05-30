import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario o email es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onShowRegister: () => void;
}

export function LoginForm({ onLogin, onShowRegister }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await onLogin(data.username, data.password);
      
      if (!success) {
        setError('Credenciales inválidas. Por favor verifica tu usuario y contraseña.');
      }
    } catch (err) {
      setError('Ocurrió un error durante el inicio de sesión. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-database text-white text-2xl"></i>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">UniQuery</h1>
        <p className="text-slate-600">Interfaz de base de datos en lenguaje natural</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario o Email</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario o email"
                {...register('username')}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  {...register('password')}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80"
                onClick={onShowRegister}
                disabled={isLoading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-center mt-6">
        <p className="text-slate-600">
          ¿No tienes una cuenta?{' '}
          <button
            className="text-primary hover:text-primary/80 font-medium"
            onClick={onShowRegister}
            disabled={isLoading}
          >
            Registrarse
          </button>
        </p>
      </div>
    </div>
  );
}
