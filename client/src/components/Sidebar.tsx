import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useDatabase } from '@/hooks/use-database';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Home, 
  Database, 
  MessageSquare, 
  Settings, 
  HelpCircle, 
  LogOut
} from 'lucide-react';
import logoUnifrutti from '@assets/LOGO-UNIFRUTTI-2021.png';

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { isConnected, activeConnection } = useDatabase();

  const navigation = [
    { name: 'Panel Principal', href: '/', icon: Home },
    { name: 'Base de Datos', href: '/database', icon: Database },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Cuenta', href: '/account', icon: Settings },
    { name: 'Ayuda', href: '/help', icon: HelpCircle },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200">
        <div className="w-10 h-10 mr-3 flex items-center justify-center">
          <img 
            src={logoUnifrutti} 
            alt="Unifrutti Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-lg font-black text-slate-800 tracking-tight">UniQuery</span>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarFallback>
              {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="px-6 py-3 border-b border-slate-200">
        <div className="flex items-center text-sm">
          {isConnected ? (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <div>
                <span className="text-green-700 font-medium">Conectado</span>
                <div className="text-xs text-slate-500">{activeConnection?.database}</div>
              </div>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-red-700">No conectado</span>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <div className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer
                ${isActive(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }
              `}>
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-slate-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-600 hover:text-slate-800"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
