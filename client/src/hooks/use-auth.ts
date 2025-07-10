// hooks/use-auth.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { databaseApi } from '@/lib/databaseApi';

export interface AuthState {
  user: any | null;
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

  // ==== CÓDIGO REAL: Escucha sesión Supabase (usuario logueado/deslogueado) ====
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && data.session.user) {
        setAuthState({
          user: data.session.user,
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
    });

    // Suscribirse a cambios de sesión de Supabase (soporta logout desde otras pestañas)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthState({
          user: session.user,
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
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // ==== LOGIN ====
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      toast({
        title: "¡Bienvenido de vuelta!",
        description: `Sesión iniciada como ${data.user.email}`,
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

  // ==== REGISTRO ====
  const register = async (userData: {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword?: string; // Solo para frontend
  }): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            username: userData.username,
          },
        },
      });
      if (error) throw error;

      setAuthState({
        user: data.user,
        isAuthenticated: false, // Esperando confirmación por correo
        isLoading: false,
      });

      toast({
        title: "¡Revisa tu correo!",
        description: "Te enviamos un enlace para confirmar tu cuenta.",
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

  // ==== LOGOUT seguro ====
  const logout = async (): Promise<void> => {
    try {
      // Obtiene el access_token JWT
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;

      // Desactiva la conexión activa antes de salir (si existe)
      if (jwt) {
        try {
          await databaseApi.deactivateConnection(jwt);
        } catch (error) {
          // No detiene logout aunque falle
          console.warn("No se pudo desactivar conexión activa:", error);
        }
      }

      // Cierra sesión normalmente
      await supabase.auth.signOut();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error al cerrar sesión",
        description: error.message || "Error desconocido",
        variant: "destructive",
      });
    }
  };

  // ==== Actualizar datos de usuario ====
  const updateUser = (user: any): void => {
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
