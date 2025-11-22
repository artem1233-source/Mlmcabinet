import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useState } from 'react';
import { calcPayouts, findUpline } from '../utils/mlm';
import { ShoppingCart, Users, DollarSign } from 'lucide-react';

interface MLMDemoProps {
  товары: any[];
  пользователи: any[];
}

export function MLMDemo({ товары, пользователи }: MLMDemoProps) {
  const [выбранныйТовар, setВыбранныйТовар] = useState(товары[0]);
  const [типПокупателя, setТипПокупателя] = useState<'гость' | 'партнер'>('гость');
  const [уровеньПокупателя, setУровеньПокупателя] = useState(1); // Партнёры начинают с уровня 1
  
  const текущийПользователь = пользователи[0]; // u_me
  const upline = findUpline(текущийПользователь.id, пользователи);
  
  const результат = calcPayouts({
    buyerIsPartner: типПокупателя === 'партнер',
    buyerLevel: уровеньПокупателя,
    referrerId: текущийПользователь.id,
    u1: upline.u1,
    u2: upline.u2,
    u3: upline.u3,
    товар: выбранныйТовар
  });
  
  return (
    <div className="p-8" style={{ backgroundColor: '#F7FAFC' }}>
      <h1 className="text-[#1E1E1E] mb-8" style={{ fontSize: '32px', fontWeight: '700' }}>
        MLM Калькулятор
      </h1>
      
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E]">Параметры продажи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[#666] mb-2 block">Товар</label>
              <select 
                value={выбранныйТовар.артикул}
                onChange={(e) => setВыбранныйТовар(товары.find(t => t.артикул === e.target.value))}
                className="w-full p-2 border border-[#E6E9EE] rounded-lg"
              >
                {товары.map(т => (
                  <option key={т.артикул} value={т.артикул}>{т.название}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-[#666] mb-2 block">Тип покупателя</label>
              <div className="flex gap-2">
                <Button
                  variant={типПокупателя === 'гость' ? 'default' : 'outline'}
                  onClick={() => setТипПокупателя('гость')}
                  className="flex-1"
                >
                  <ShoppingCart size={16} className="mr-2" />
                  Гость
                </Button>
                <Button
                  variant={типПокупателя === 'партнер' ? 'default' : 'outline'}
                  onClick={() => setТипПокупателя('партнер')}
                  className="flex-1"
                >
                  <Users size={16} className="mr-2" />
                  Партнёр
                </Button>
              </div>
            </div>
            
            {типПокупателя === 'партнер' && (
              <div>
                <label className="text-[#666] mb-2 block">Уровень партнёра</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map(уровень => (
                    <Button
                      key={уровень}
                      variant={уровеньПокупателя === уровень ? 'default' : 'outline'}
                      onClick={() => setУровеньПокупателя(уровень)}
                      size="sm"
                    >
                      У{уровень}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-[#F7FAFC] p-4 rounded-xl">
              <div className="text-[#666] mb-2">Цена для покупателя</div>
              <div className="text-[#39B7FF]" style={{ fontSize: '32px', fontWeight: '700' }}>
                ₽{результат.price.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
              <DollarSign size={20} />
              Распределение выплат
            </CardTitle>
          </CardHeader>
          <CardContent>
            {результат.payouts.length === 0 ? (
              <div className="text-center py-8 text-[#666]">
                Нет выплат
              </div>
            ) : (
              <div className="space-y-3">
                {результат.payouts.map((выплата, индекс) => {
                  const пользователь = пользователи.find(u => u.id === выплата.userId);
                  const цветУровня = ['#39B7FF', '#12C9B6', '#F59E0B', '#EF4444'];
                  const индексУровня = ['L0', 'L1', 'L2', 'L3'].indexOf(выплата.level);
                  
                  return (
                    <div 
                      key={индекс}
                      className="flex items-center justify-between p-4 bg-[#F7FAFC] rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: цветУровня[индексУровня], fontWeight: '700' }}
                        >
                          {пользователь?.имя.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[#1E1E1E]" style={{ fontWeight: '600' }}>
                            {пользователь?.имя || 'Неизвестно'}
                          </div>
                          <Badge 
                            className="border-0 text-white mt-1"
                            style={{ backgroundColor: цветУровня[индексУровня], fontSize: '10px' }}
                          >
                            {выплата.level}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-[#12C9B6]" style={{ fontSize: '20px', fontWeight: '700' }}>
                        +₽{выплата.amount.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
                
                <div className="mt-4 pt-4 border-t border-[#E6E9EE]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#666]" style={{ fontWeight: '600' }}>Всего выплат:</span>
                    <span className="text-[#39B7FF]" style={{ fontSize: '24px', fontWeight: '700' }}>
                      ₽{результат.payouts.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm bg-white mt-6">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E]">Информация о ценах</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-[#666]" style={{ fontSize: '12px' }}>Гость</div>
              <div className="text-[#1E1E1E] mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
                ₽{выбранныйТовар.базоваяЦена.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-4 bg-[#F7FAFC] rounded-xl">
              <div className="text-[#666]" style={{ fontSize: '12px' }}>Уровень 1</div>
              <div className="text-[#1E1E1E] mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
                ₽{выбранныйТовар.цена1.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-4 bg-[#F7FAFC] rounded-xl">
              <div className="text-[#666]" style={{ fontSize: '12px' }}>Уровень 2</div>
              <div className="text-[#1E1E1E] mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
                ₽{выбранныйТовар.цена2.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-4 bg-[#F7FAFC] rounded-xl">
              <div className="text-[#666]" style={{ fontSize: '12px' }}>Уровень 3</div>
              <div className="text-[#1E1E1E] mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
                ₽{выбранныйТовар.цена3.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="text-green-700" style={{ fontSize: '12px', fontWeight: '600' }}>Партнёр</div>
              <div className="text-[#1E1E1E] mt-2" style={{ fontSize: '20px', fontWeight: '700' }}>
                ₽{выбранныйТовар.партнёрскаяЦена.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
