import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Copy, Check, Users, TrendingUp } from 'lucide-react';

export function PartnerIdDemo() {
  const [copied, setCopied] = useState(false);
  
  const partnerId = "000001";
  
  const handleCopy = () => {
    navigator.clipboard.writeText(partnerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <h1 className="text-[#1E1E1E]" style={{ fontSize: '32px', fontWeight: '700' }}>
            Система ID партнеров
          </h1>
          <p className="text-[#666]" style={{ fontSize: '16px' }}>
            Каждый партнер получает уникальный ID при регистрации
          </p>
        </div>

        {/* ID Card */}
        <Card className="border-[#E6E9EE] rounded-2xl shadow-lg bg-gradient-to-br from-white to-[#F7FAFC]">
          <CardHeader className="text-center pb-4">
            <CardDescription>Пример ID партнера</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Partner ID Display */}
            <div className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] rounded-2xl p-6 text-center">
              <div className="text-white/80 mb-2" style={{ fontSize: '14px' }}>
                Ваш уникальный ID
              </div>
              <div 
                className="text-white mb-4" 
                style={{ fontSize: '48px', fontWeight: '700', letterSpacing: '4px' }}
              >
                {partnerId}
              </div>
              <Button
                onClick={handleCopy}
                className="bg-white text-[#39B7FF] hover:bg-white/90"
              >
                {copied ? (
                  <>
                    <Check size={16} className="mr-2" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy size={16} className="mr-2" />
                    Скопировать ID
                  </>
                )}
              </Button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F7FAFC] rounded-xl border border-[#E6E9EE]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#39B7FF]/10 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#39B7FF]" />
                  </div>
                  <div>
                    <div className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                      Реферальная система
                    </div>
                  </div>
                </div>
                <p className="text-[#666] text-sm">
                  ID = Реферальный код для приглашения новых партнеров
                </p>
              </div>

              <div className="p-4 bg-[#F7FAFC] rounded-xl border border-[#E6E9EE]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#12C9B6]/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#12C9B6]" />
                  </div>
                  <div>
                    <div className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                      Автоматическая генерация
                    </div>
                  </div>
                </div>
                <p className="text-[#666] text-sm">
                  ID генерируется автоматически при регистрации
                </p>
              </div>
            </div>

            {/* Format Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="text-[#1E1E1E] mb-2" style={{ fontWeight: '600', fontSize: '14px' }}>
                Формат ID партнера
              </div>
              <div className="space-y-2 text-sm text-[#666]">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white">6 цифр</Badge>
                  <span>с ведущими нулями</span>
                </div>
                <div className="text-xs">
                  Примеры: <code className="bg-white px-2 py-1 rounded">000001</code>, <code className="bg-white px-2 py-1 rounded">000002</code>, <code className="bg-white px-2 py-1 rounded">000123</code>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-[#39B7FF] hover:bg-[#39B7FF]/90 text-white"
                onClick={() => window.location.href = '/register'}
              >
                Зарегистрировать партнера
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-[#39B7FF] text-[#39B7FF] hover:bg-[#39B7FF]/10"
                onClick={() => window.location.href = '/login'}
              >
                Войти в систему
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-[#E6E9EE] text-center">
            <div className="text-[#39B7FF] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
              000001
            </div>
            <div className="text-[#666] text-sm">
              Первый партнер
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-[#E6E9EE] text-center">
            <div className="text-[#12C9B6] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
              000002
            </div>
            <div className="text-[#666] text-sm">
              Второй партнер
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-[#E6E9EE] text-center">
            <div className="text-[#FF6B6B] mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
              999999
            </div>
            <div className="text-[#666] text-sm">
              Масштабируемо
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}