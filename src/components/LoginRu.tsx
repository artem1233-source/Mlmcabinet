import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, LogIn } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import * as api from '../utils/api';

interface LoginRuProps {
  onSwitchToRegister?: () => void;
  onLogin?: (userId: string) => void;
}

export function LoginRu({ onSwitchToRegister, onLogin }: LoginRuProps) {
  console.log('🔵 LoginRu rendering, onSwitchToRegister:', typeof onSwitchToRegister, 'onLogin:', typeof onLogin);
  
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.login || !formData.password) {
      setError('Пожалуйста, заполните все поля');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Logging in with:', formData.login);
      
      // Используем наш серверный роут /auth/login
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            login: formData.login,
            password: formData.password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при входе');
      }

      if (data.access_token && data.user) {
        console.log('✅ Login successful, user:', data.user);
        console.log('🔑 Access token received:', data.access_token.substring(0, 20) + '...');
        console.log('📋 User data:', {
          id: data.user.id,
          type: data.user.type,
          role: data.user.role,
          isAdmin: data.user.isAdmin
        });
        
        // Сохраняем access_token для admin операций
        localStorage.setItem('access_token', data.access_token);
        console.log('💾 Access token saved to localStorage');
        
        // Verify it's saved immediately
        const savedToken = localStorage.getItem('access_token');
        console.log('✔️ Immediate verification - token in localStorage:', savedToken ? 'YES ✓' : 'NO ✗');
        if (savedToken) {
          console.log('✔️ Saved token length:', savedToken.length);
          console.log('✔️ Saved token preview:', savedToken.substring(0, 20) + '...');
        }
        
        // Используем api.setAuthToken для сохранения userId
        // (система использует userId как токен)
        api.setAuthToken(data.user.id);
        console.log('💾 User ID saved via api.setAuthToken:', data.user.id);
        
        console.log('🚀 Calling onLogin callback with userId:', data.user.id);
        
        // Вызываем колбэк onLogin, если он передан
        if (onLogin) {
          onLogin(data.user.id);
        } else {
          // Fallback: если колбэк не передан, используем редирект
          console.log('⚠️ No onLogin callback provided, using fallback redirect');
          window.location.href = '/';
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-[#39B7FF]/10 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-6 h-6 text-[#39B7FF]" />
          </div>
          <CardTitle className="text-2xl">Вход в личный кабинет</CardTitle>
          <CardDescription>
            Введите свои данные для входа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="login">ID партнера или Email</Label>
              <Input
                id="login"
                name="login"
                type="text"
                placeholder="000001 или partner@example.com"
                value={formData.login}
                onChange={handleChange}
                disabled={loading}
                required
              />
              <p className="text-xs text-gray-500">
                Вы можете войти используя ваш ID партнера или Email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Введите пароль"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#39B7FF] hover:bg-[#39B7FF]/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>

            <p className="text-sm text-center text-gray-600">
              Нет аккаунта?{' '}
              <button 
                type="button"
                onClick={() => {
                  console.log('🔵 LoginRu: Switching to register screen');
                  if (onSwitchToRegister) {
                    onSwitchToRegister();
                  }
                }}
                className="text-[#39B7FF] hover:underline bg-transparent border-none cursor-pointer p-0 inline"
              >
                Зарегистрироваться
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}