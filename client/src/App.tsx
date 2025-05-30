import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { DatabaseProvider } from "@/contexts/DatabaseContext";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import { DatabaseConnection } from "@/components/DatabaseConnection";
import Chat from "@/pages/Chat";
import Account from "@/pages/Account";
import Help from "@/pages/Help";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <DatabaseProvider>
      <div className="min-h-screen flex bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
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
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Database Connection</h1>
                <p className="text-muted-foreground">
                  Connect to your database to start querying with natural language
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
            <div className="h-[calc(100vh-4rem)] flex flex-col">
              <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Query Chat</h1>
                <p className="text-muted-foreground">
                  Ask questions about your database in natural language
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <Chat />
              </div>
            </div>
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/account">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Account />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/help">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Help />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route>
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <NotFound />
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
