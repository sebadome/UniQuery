import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';

export default function Login() {
  const [showRegister, setShowRegister] = useState(false);
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();

  const handleLogin = async (username: string, password: string) => {
    const success = await login(username, password);
    if (success) {
      setLocation('/');
    }
    return success;
  };

  const handleRegister = async (userData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
  }) => {
    const success = await register(userData);
    if (success) {
      setLocation('/');
    }
    return success;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {showRegister ? (
        <RegisterForm
          onRegister={handleRegister}
          onShowLogin={() => setShowRegister(false)}
        />
      ) : (
        <LoginForm
          onLogin={handleLogin}
          onShowRegister={() => setShowRegister(true)}
        />
      )}
    </div>
  );
}
