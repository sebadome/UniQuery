import { useState, useEffect } from 'react';
import { authStorage, type User } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session on mount
    const token = authStorage.getToken();
    const user = authStorage.getUser();
    
    if (token && user) {
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login(username, password);
      
      authStorage.setToken(response.token);
      authStorage.setUser(response.user);
      
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });

      toast({
        title: "¡Bienvenido de vuelta!",
        description: `Sesión iniciada como ${response.user.name}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error de inicio de sesión",
        description: error.message || "Credenciales inválidas",
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (userData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
  }): Promise<boolean> => {
    try {
      const response = await authApi.register(userData);
      
      authStorage.setToken(response.token);
      authStorage.setUser(response.user);
      
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });

      toast({
        title: "¡Cuenta creada!",
        description: `¡Bienvenido, ${response.user.name}!`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error de registro",
        description: error.message || "Error al crear la cuenta",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      authStorage.clear();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
    }
  };

  const updateUser = (user: User): void => {
    authStorage.setUser(user);
    setAuthState(prev => ({
      ...prev,
      user,
    }));
  };

  return {
    ...authState,
    login,
    register,
    logout,
    updateUser,
  };
}
