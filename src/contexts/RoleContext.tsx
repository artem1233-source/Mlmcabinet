import { createContext, useContext, useState, ReactNode } from 'react';

export type RoleType = 
  | 'owner' 
  | 'adminops' 
  | 'finance' 
  | 'warehouse' 
  | 'marketing' 
  | 'support' 
  | 'partner';

interface RoleContextType {
  currentRole: RoleType;
  setCurrentRole: (role: RoleType) => void;
  inspectionMode: boolean;
  setInspectionMode: (mode: boolean) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<RoleType>('partner'); // 🔧 По умолчанию роль 'partner' для обычных пользователей
  const [inspectionMode, setInspectionMode] = useState(false);

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, inspectionMode, setInspectionMode }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

// Определение доступа к пунктам меню для каждой роли
export const rolePermissions: Record<RoleType, string[]> = {
  owner: [
    'дашборд', 'пользователи', 'заказы', 'финансы', 'каталог', 
    'маркетинг', 'обучение', 'достижения', 'уведомления', 
    'профиль', 'настройки', 'админ', 'управление-админами', 'h2-admin'
  ],
  adminops: [
    'дашборд', 'пользователи', 'заказы', 'каталог', 
    'обучение', 'достижения', 'уведомления', 
    'профиль', 'настройки'
  ],
  finance: [
    'дашборд', 'заказы', 'финансы', 
    'уведомления', 'профиль', 'настройки'
  ],
  warehouse: [
    'дашборд', 'заказы', 'каталог', 
    'уведомления', 'профиль', 'настройки'
  ],
  marketing: [
    'дашборд', 'пользователи', 'маркетинг', 
    'уведомления', 'профиль', 'настройки'
  ],
  support: [
    'дашборд', 'пользователи', 'заказы', 
    'уведомления', 'профиль', 'настройки'
  ],
  partner: [
    'дашборд', 'структура', 'заказы', 'доходы', 'баланс',
    'каталог', 'маркетинг', 'обучение', 'достижения', 
    'уведомления', 'профиль', 'настройки'
  ],
};

// Проверка доступа к пункту меню для роли
export function hasAccess(role: RoleType, menuItem: string): boolean {
  return rolePermissions[role].includes(menuItem);
}

// Получение названия роли на русском
export function getRoleLabel(role: RoleType): string {
  const labels: Record<RoleType, string> = {
    owner: 'Владелец (Owner/SuperAdmin)',
    adminops: 'Администрирование',
    finance: 'Финансы',
    warehouse: 'Склад',
    marketing: 'Маркетинг',
    support: 'Поддержка',
    partner: 'Партнёр',
  };
  return labels[role];
}