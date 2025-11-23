import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, UserPlus, CheckCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function RegistrationRu() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    sponsorRefCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [partnerId, setPartnerId] = useState('');

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

    // Валидация
    if (!formData.name || !formData.email || !formData.password) {
      setError('Пожалуйста, заполните все обязательные поля');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Неверный формат email');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05aa3c8a/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            sponsorRefCode: formData.sponsorRefCode
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при регистрации');
      }

      setPartnerId(data.partnerId);
      setSuccess(true);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Регистрация успешна!</CardTitle>
            <CardDescription>
              Ваш аккаунт партнера создан
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#39B7FF]/10 border border-[#39B7FF]/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Ваш ID партнера:</p>
              <p className="text-2xl font-bold text-[#39B7FF]">{partnerId}</p>
            </div>
            <p className="text-sm text-gray-600 text-center">
              На ваш email отправлено письмо с данными для входа
            </p>
            <Button 
              className="w-full bg-[#39B7FF] hover:bg-[#39B7FF]/90"
              onClick={() => window.location.href = '/login'}
            >
              Войти в личный кабинет
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-[#39B7FF]/10 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-[#39B7FF]" />
          </div>
          <CardTitle className="text-2xl">Регистрация партнера</CardTitle>
          <CardDescription>
            Создайте аккаунт и получите уникальный ID партнера
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
              <Label htmlFor="name">
                ФИО <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Иванов Иван Иванович"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="partner@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Пароль <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Минимум 6 символов"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Подтвердите пароль <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Повторите пароль"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sponsorRefCode">
                Реферальный код спонсора (если есть)
              </Label>
              <Input
                id="sponsorRefCode"
                name="sponsorRefCode"
                type="text"
                placeholder="000001"
                value={formData.sponsorRefCode}
                onChange={handleChange}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Оставьте пустым, если регистрируетесь без спонсора
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#39B7FF] hover:bg-[#39B7FF]/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Регистрация...
                </>
              ) : (
                'Зарегистрироваться'
              )}
            </Button>

            <p className="text-sm text-center text-gray-600">
              Уже есть аккаунт?{' '}
              <a href="/login" className="text-[#39B7FF] hover:underline">
                Войти
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
