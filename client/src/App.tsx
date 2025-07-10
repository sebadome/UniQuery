import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import TestDataDict from './pages/TestDataDict';

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import { DatabaseConnection } from "@/components/DatabaseConnection";
import Chat from "@/pages/Chat";
import Account from "@/pages/Account";
import Help from "@/pages/Help";
import NotFound from "@/pages/not-found";

// Layout principal: altura total, sin padding
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <DatabaseProvider>
      <div className="flex h-screen min-h-0 bg-slate-50">
        <Sidebar />
        {/* main: sin p-8, solo flex, altura completa */}
        <main className="flex-1 flex flex-col min-h-0 h-screen">
          {children}
        </main>
      </div>
    </DatabaseProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-database text-white text-2xl"></i>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* ---------- DEMO RUTA: test-dict ---------- */}
      <Route path="/test-dict">
        <main className="p-8 bg-white min-h-screen flex items-center justify-center">
          <div className="max-w-xl w-full">
            <h2 className="text-2xl font-bold mb-4">Demo: Diccionario de Datos</h2>
            <TestDataDict />
          </div>
        </main>
      </Route>
      {/* ---------- FIN DEMO ---------- */}

      {/* Public routes */}
      <Route path="/login">
        <Login />
      </Route>

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/database">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <div className="space-y-6 p-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Conexión a Base de Datos</h1>
                <p className="text-muted-foreground">
                  Conéctate a tu base de datos para comenzar a consultar con lenguaje natural
                </p>
              </div>
              <DatabaseConnection />
            </div>
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/chat">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <div className="flex flex-col flex-1 min-h-0 h-full">
              {/* Header del chat con padding */}
              <div className="pt-4 pb-2 px-8">
                <h1 className="text-3xl font-bold tracking-tight">Chat de Consultas</h1>
                <p className="text-muted-foreground">
                  Haz preguntas sobre tu base de datos en lenguaje natural
                </p>
              </div>
              {/* Chat ocupa todo el espacio restante */}
              <div className="flex-1 min-h-0 flex flex-col">
                <Chat />
              </div>
            </div>
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/account">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <div className="p-8">
              <Account />
            </div>
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/help">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <div className="p-8">
              <Help />
            </div>
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route>
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <div className="p-8">
              <NotFound />
            </div>
          </AuthenticatedLayout>
        ) : (
          <NotFound />
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
