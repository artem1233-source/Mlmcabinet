// 💰 РЕДАКТОР КОМИССИЙ ПРОДУКТА

import React from 'react';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DollarSign, TrendingUp, Users, UserCheck, AlertCircle } from 'lucide-react';
import type { ProductCommission } from '../utils/types/commission';
import { validateCommission, DEFAULT_COMMISSIONS } from '../utils/types/commission';

// Дефолтная комиссия если не передана
const EMPTY_COMMISSION: ProductCommission = {
  guest: { L0: 0, L1: 0, L2: 0, L3: 0 },
  partner: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 }
};

interface CommissionEditorProps {
  commission?: ProductCommission; // ✅ Сделано необязательным
  onChange?: (commission: ProductCommission) => void;
  disabled?: boolean;
  retailPrice?: number; // цена_розница
  partnerPrice?: number; // цена1
}

export function CommissionEditor({ commission, onChange, disabled = false, retailPrice, partnerPrice }: CommissionEditorProps) {
  const [localCommission, setLocalCommission] = useState<ProductCommission>(commission || EMPTY_COMMISSION);
  const [validationError, setValidationError] = useState<string>('');

  // 🆕 Синхронизация localCommission с пропом commission
  useEffect(() => {
    console.log('🔄 CommissionEditor: updating localCommission from prop', commission);
    setLocalCommission(commission || EMPTY_COMMISSION);
  }, [commission]);

  const handleChange = (type: 'guest' | 'partner', level: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    const updated = {
      ...localCommission,
      [type]: {
        ...localCommission[type],
        [level]: numValue
      }
    };

    // Валидация
    const validation = validateCommission(updated);
    if (!validation.valid) {
      setValidationError(validation.error || '');
    } else {
      setValidationError('');
    }

    setLocalCommission(updated);
    onChange && onChange(updated);
  };

  const totalGuestCommission = Object.values(localCommission.guest || {}).reduce((sum, v) => sum + (v || 0), 0);
  const totalPartnerCommission = Object.values(localCommission.partner || {}).reduce((sum, v) => sum + (v || 0), 0);

  // 🆕 Расчёт формул MLM
  const commissionGuestL0 = localCommission.guest?.L0 || 0;
  const commissionGuestL1 = localCommission.guest?.L1 || 0;
  const commissionGuestL2 = localCommission.guest?.L2 || 0;
  const commissionGuestL3 = localCommission.guest?.L3 || 0;
  const commissionPartnerL1 = localCommission.partner?.L1 || 0;
  const commissionPartnerL2 = localCommission.partner?.L2 || 0;
  const commissionPartnerL3 = localCommission.partner?.L3 || 0;
  const commissionPartnerL4 = localCommission.partner?.L4 || 0;
  const commissionPartnerL5 = localCommission.partner?.L5 || 0;

  // Формулы для розничной продажи
  // retailPrice = commissionGuestL0 + commissionGuestL1 + commissionGuestL2 + commissionGuestL3 + companyIncomeRetail
  const sumGuestCommissions = commissionGuestL0 + commissionGuestL1 + commissionGuestL2 + commissionGuestL3;
  const companyIncomeRetail = (retailPrice || 0) - sumGuestCommissions;
  const retailCheckSum = sumGuestCommissions + companyIncomeRetail;
  const retailCheckValid = Math.abs(retailCheckSum - (retailPrice || 0)) < 0.01; // Допуск на погрешность

  // Формулы для партнёрской продажи
  // partnerPrice = sumPartnerCommissions + companyIncomePartner
  const sumPartnerCommissions = commissionPartnerL1 + commissionPartnerL2 + commissionPartnerL3 + commissionPartnerL4 + commissionPartnerL5;
  const companyIncomePartner = (partnerPrice || 0) - sumPartnerCommissions;
  const partnerCheckSum = sumPartnerCommissions + companyIncomePartner;
  const partnerCheckValid = Math.abs(partnerCheckSum - (partnerPrice || 0)) < 0.01;

  return (
    <div className="space-y-4">
      {validationError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Комиссии для гостей (розничные продажи) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#39B7FF]" />
            <div>
              <CardTitle>Розничные продажи (гость)</CardTitle>
              <CardDescription>
                Комиссии при продаже гостю (не партнёру). L0 идёт продавцу, L1/L2/L3 - спонсорам продавца
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="guest-L0" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                L0 - Продавец
              </Label>
              <Input
                id="guest-L0"
                type="number"
                min="0"
                step="10"
                value={localCommission.guest?.L0 || 0}
                onChange={(e) => handleChange('guest', 'L0', e.target.value)}
                disabled={disabled}
                className="mt-1"
                placeholder="1600"
              />
            </div>
            
            <div>
              <Label htmlFor="guest-L1" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                L1 - Спонсор продавца
              </Label>
              <Input
                id="guest-L1"
                type="number"
                min="0"
                step="10"
                value={localCommission.guest?.L1 || 0}
                onChange={(e) => handleChange('guest', 'L1', e.target.value)}
                disabled={disabled}
                className="mt-1"
                placeholder="900"
              />
            </div>
            
            <div>
              <Label htmlFor="guest-L2" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-500" />
                L2 - Спонсор 2-й линии
              </Label>
              <Input
                id="guest-L2"
                type="number"
                min="0"
                step="10"
                value={localCommission.guest?.L2 || 0}
                onChange={(e) => handleChange('guest', 'L2', e.target.value)}
                disabled={disabled}
                className="mt-1"
                placeholder="500"
              />
            </div>
            
            <div>
              <Label htmlFor="guest-L3" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                L3 - Спонсор 3-й линии
              </Label>
              <Input
                id="guest-L3"
                type="number"
                min="0"
                step="10"
                value={localCommission.guest?.L3 || 0}
                onChange={(e) => handleChange('guest', 'L3', e.target.value)}
                disabled={disabled}
                className="mt-1"
                placeholder="200"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-lg">
            <span className="text-sm text-gray-600">Итого комиссий (розница):</span>
            <Badge style={{ backgroundColor: '#39B7FF' }}>
              {totalGuestCommission.toLocaleString('ru-RU')} ₽
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Комиссии для партнёров */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#12C9B6]" />
            <div>
              <CardTitle>Партнёрские продажи</CardTitle>
              <CardDescription>
                Комиссии при продаже партнёру (распределение по апл)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="partner-L1" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                L1 - 1-я линия (спонсор)
              </Label>
              <Input
                id="partner-L1"
                type="number"
                min="0"
                step="10"
                value={localCommission.partner?.L1 || 0}
                onChange={(e) => handleChange('partner', 'L1', e.target.value)}
                disabled={disabled}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="partner-L2" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-500" />
                L2 - 2-я линия
              </Label>
              <Input
                id="partner-L2"
                type="number"
                min="0"
                step="10"
                value={localCommission.partner?.L2 || 0}
                onChange={(e) => handleChange('partner', 'L2', e.target.value)}
                disabled={disabled}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="partner-L3" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                L3 - 3-я линия
              </Label>
              <Input
                id="partner-L3"
                type="number"
                min="0"
                step="10"
                value={localCommission.partner?.L3 || 0}
                onChange={(e) => handleChange('partner', 'L3', e.target.value)}
                disabled={disabled}
                className="mt-1"
              />
            </div>
          </div>

          {/* Дополнительные уровни (опционально) */}
          <details className="mt-4">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
              + Добавить дополнительные уровни (L4, L5)
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="partner-L4" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  L4 - 4-я линия (опционально)
                </Label>
                <Input
                  id="partner-L4"
                  type="number"
                  min="0"
                  step="10"
                  value={localCommission.partner?.L4 || 0}
                  onChange={(e) => handleChange('partner', 'L4', e.target.value)}
                  disabled={disabled}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="partner-L5" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  L5 - 5-я линия (опционально)
                </Label>
                <Input
                  id="partner-L5"
                  type="number"
                  min="0"
                  step="10"
                  value={localCommission.partner?.L5 || 0}
                  onChange={(e) => handleChange('partner', 'L5', e.target.value)}
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
            </div>
          </details>

          <div className="flex items-center justify-between p-3 bg-[#F7FAFC] rounded-lg">
            <span className="text-sm text-gray-600">Итого комиссий (партнёр):</span>
            <Badge style={{ backgroundColor: '#12C9B6' }}>
              {totalPartnerCommission.toLocaleString('ru-RU')} ₽
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Подсказки */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Рекомендации:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>L0 (розница) обычно выше, т.к. продажа по полной цене</li>
                <li>L1 (спонсор) получает наибольшую партнёрскую комиссию</li>
                <li>L2 и L3 — меньшие комиссии за более дальние линии</li>
                <li>Сумма комиссий не должна превышать маржу продукта</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🆕 ФОРМУЛЫ MLM - Розничная продажа */}
      {retailPrice !== undefined && retailPrice > 0 && (
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Розничная продажа (гость покупает за {retailPrice.toLocaleString('ru-RU')} ₽)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Цена гостя:</div>
                <div className="font-semibold text-purple-900">{retailPrice.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Комиссия L0 (продавец):</div>
                <div className="font-semibold text-green-600">{commissionGuestL0.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Комиссия L1 (спонсор):</div>
                <div className="font-semibold text-blue-600">{commissionGuestL1.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Комиссия L2:</div>
                <div className="font-semibold text-rose-600">{commissionGuestL2.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Комиссия L3:</div>
                <div className="font-semibold text-amber-600">{commissionGuestL3.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Итого комиссии:</div>
                <div className="font-semibold text-green-700">{sumGuestCommissions.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Цена компании:</div>
                <div className="font-semibold text-blue-600">{companyIncomeRetail.toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>
            <div className={`p-3 rounded-lg border-2 ${retailCheckValid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="text-xs text-gray-600 mb-1">Проверка формулы:</div>
              <div className={`text-sm font-mono ${retailCheckValid ? 'text-green-700' : 'text-red-700'}`}>
                L0 ({commissionGuestL0}) + L1 ({commissionGuestL1}) + L2 ({commissionGuestL2}) + L3 ({commissionGuestL3}) + Компания ({companyIncomeRetail.toLocaleString('ru-RU')}) = {retailCheckSum.toLocaleString('ru-RU')} ₽
                {retailCheckValid ? ' ✓' : ` ✗ (ожидалось ${retailPrice.toLocaleString('ru-RU')} ₽)`}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🆕 ФОРМУЛЫ MLM - Партнёрская продажа */}
      {partnerPrice !== undefined && partnerPrice > 0 && (
        <Card className="border-2 border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-emerald-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Партнёрская продажа (партнёр покупает за {partnerPrice.toLocaleString('ru-RU')} ₽)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Цена партнёра:</div>
                <div className="font-semibold text-emerald-900">{partnerPrice.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Комиссия L1:</div>
                <div className="font-semibold text-blue-600">{commissionPartnerL1.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Комиссия L2:</div>
                <div className="font-semibold text-rose-600">{commissionPartnerL2.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Комиссия L3:</div>
                <div className="font-semibold text-amber-600">{commissionPartnerL3.toLocaleString('ru-RU')} ₽</div>
              </div>
              {(commissionPartnerL4 > 0 || commissionPartnerL5 > 0) && (
                <>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-gray-600 mb-1">Комиссия L4:</div>
                    <div className="font-semibold text-purple-600">{commissionPartnerL4.toLocaleString('ru-RU')} ₽</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-gray-600 mb-1">Комиссия L5:</div>
                    <div className="font-semibold text-indigo-600">{commissionPartnerL5.toLocaleString('ru-RU')} ₽</div>
                  </div>
                </>
              )}
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Итого комиссии:</div>
                <div className="font-semibold text-green-600">{sumPartnerCommissions.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600 mb-1">Цена компании:</div>
                <div className="font-semibold text-blue-600">{companyIncomePartner.toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>
            <div className={`p-3 rounded-lg border-2 ${partnerCheckValid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="text-xs text-gray-600 mb-1">Проверка формулы:</div>
              <div className={`text-sm font-mono ${partnerCheckValid ? 'text-green-700' : 'text-red-700'}`}>
                L1 ({commissionPartnerL1}) + L2 ({commissionPartnerL2}) + L3 ({commissionPartnerL3})
                {(commissionPartnerL4 > 0 || commissionPartnerL5 > 0) && ` + L4 (${commissionPartnerL4}) + L5 (${commissionPartnerL5})`}
                {' '}+ Компания ({companyIncomePartner.toLocaleString('ru-RU')}) = {partnerCheckSum.toLocaleString('ru-RU')} ₽
                {partnerCheckValid ? ' ✓' : ` ✗ (ожидалось ${partnerPrice.toLocaleString('ru-RU')} ₽)`}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}