import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';

export default function Login() {
  const [showRegister, setShowRegister] = useState(false);
  const { login, register } = useAuth();

  const handleLogin = async (username: string, password: string) => {
    return await login(username, password);
  };

  const handleRegister = async (userData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
  }) => {
    return await register(userData);
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
