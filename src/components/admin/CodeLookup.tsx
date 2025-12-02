import { useState } from 'react';
import { Search, User, Hash, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import * as api from '../../utils/api';

interface CodeInfo {
  userId: string;
  primary: boolean;
  isActive: boolean;
  createdAt: string;
}

interface UserInfo {
  id: string;
  имя: string;
  фамилия: string;
  email: string;
  codes?: Array<{
    value: string;
    type: string;
    primary: boolean;
    isActive: boolean;
    createdAt: string;
  }>;
}

export function CodeLookup() {
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    codeInfo?: CodeInfo;
    user?: UserInfo;
    error?: string;
  } | null>(null);

  const handleSearch = async () => {
    if (!searchCode.trim()) {
      toast.error('Введите код для поиска');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await api.resolveCode(searchCode.trim());
      
      if (response.success && response.userId) {
        setResult({
          found: true,
          codeInfo: {
            userId: response.userId,
            primary: response.primary || false,
            isActive: response.isActive !== false,
            createdAt: response.createdAt || ''
          },
          user: response.user
        });
      } else {
        setResult({
          found: false,
          error: response.error || 'Код не найден'
        });
      }
    } catch (error) {
      console.error('Error resolving code:', error);
      setResult({
        found: false,
        error: 'Ошибка поиска'
      });
      toast.error('Ошибка при поиске кода');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-[#1E1E1E]">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base">Поиск партнёра по коду</span>
            <p className="text-xs text-gray-500 font-normal">Найти пользователя по любому из его кодов/ID</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите код или ID (например: 001, ABC123)"
              className="pl-10"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800"
          >
            {loading ? 'Поиск...' : 'Найти'}
          </Button>
        </div>

        {result && (
          <div className={`p-4 rounded-xl border-2 ${
            result.found 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {result.found ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Код найден!</span>
                </div>
                
                {result.user && (
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#39B7FF] to-[#12C9B6] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-[#1E1E1E]">
                          {result.user.имя} {result.user.фамилия}
                        </div>
                        <div className="text-sm text-gray-500">{result.user.email}</div>
                      </div>
                      <Badge className="bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white">
                        ID: {result.user.id}
                      </Badge>
                    </div>
                    
                    {result.codeInfo && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className={result.codeInfo.primary ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : 'border-gray-300'}>
                          <Hash className="w-3 h-3 mr-1" />
                          {searchCode}
                          {result.codeInfo.primary && ' (основной)'}
                        </Badge>
                        <Badge variant="outline" className={result.codeInfo.isActive ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}>
                          {result.codeInfo.isActive ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </div>
                    )}

                    {result.user.codes && result.user.codes.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-2">Все коды пользователя:</div>
                        <div className="flex flex-wrap gap-1">
                          {result.user.codes.map((code, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className={`text-xs ${
                                code.primary 
                                  ? 'border-yellow-500 text-yellow-700 bg-yellow-50' 
                                  : code.isActive 
                                    ? 'border-gray-300' 
                                    : 'border-gray-200 text-gray-400 line-through'
                              }`}
                            >
                              {code.value}
                              {code.primary && ' ★'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{result.error}</span>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">Подсказка:</p>
              <p>Вы можете искать партнёра по любому из его кодов - основному ID или дополнительным кодам, которые были присвоены ранее.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
