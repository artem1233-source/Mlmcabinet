/**
 * Centralized Role Access Control System
 * Управление правами доступа по ролям
 */

import { Role } from '../types';

/**
 * Модули системы (верхние вкладки в интерфейсе)
 */
export type Module = 
  | 'control'      // Центр управления
  | 'admin'        // Администрирование
  | 'finance'      // Финансы
  | 'warehouse'    // Склад
  | 'marketing'    // SEO/Маркетинг
  | 'support'      // Поддержка
  | 'partner';     // Партнёр

/**
 * Разделы внутри модулей (левое меню)
 */
export type Section = 
  | 'dashboard'
  | 'admin'
  | 'finance'
  | 'warehouse'
  | 'marketing'
  | 'support'
  | 'partner'
  | 'orders'
  | 'analytics'
  | 'settings'
  | 'testing';

/**
 * Матрица доступа: какие модули видны для каждой роли
 */
const MODULE_ACCESS: Record<Role, Module[]> = {
  SEO: ['control', 'admin', 'finance', 'warehouse', 'marketing', 'support', 'partner'],
  AdminOps: ['admin'],
  Finance: ['finance'],
  Warehouse: ['warehouse'],
  Marketing: ['marketing'],
  Support: ['support'],
  Partner: ['partner']
};

/**
 * Матрица доступа: какие разделы доступны для каждой роли
 */
const SECTION_ACCESS: Record<Role, Section[]> = {
  SEO: ['dashboard', 'admin', 'finance', 'warehouse', 'marketing', 'support', 'partner', 'orders', 'analytics', 'settings', 'testing'],
  AdminOps: ['admin', 'orders', 'analytics', 'settings'],
  Finance: ['finance', 'orders', 'analytics', 'settings'],
  Warehouse: ['warehouse', 'orders', 'settings'],
  Marketing: ['marketing', 'analytics', 'settings'],
  Support: ['support', 'orders', 'settings'],
  Partner: ['partner', 'orders', 'settings']
};

/**
 * Домашний дашборд для каждой роли
 */
const HOME_DASHBOARD: Record<Role, Section> = {
  SEO: 'dashboard',
  AdminOps: 'admin',
  Finance: 'finance',
  Warehouse: 'warehouse',
  Marketing: 'marketing',
  Support: 'support',
  Partner: 'partner'
};

/**
 * Проверяет, имеет ли роль доступ к модулю
 */
export function hasModuleAccess(role: Role, module: Module): boolean {
  return MODULE_ACCESS[role]?.includes(module) ?? false;
}

/**
 * Проверяет, имеет ли роль доступ к разделу
 */
export function hasSectionAccess(role: Role, section: Section): boolean {
  return SECTION_ACCESS[role]?.includes(section) ?? false;
}

/**
 * Получает список доступных модулей для роли
 */
export function getAvailableModules(role: Role): Module[] {
  return MODULE_ACCESS[role] ?? [];
}

/**
 * Получает список доступных разделов для роли
 */
export function getAvailableSections(role: Role): Section[] {
  return SECTION_ACCESS[role] ?? [];
}

/**
 * Получает домашний дашборд для роли
 */
export function getHomeDashboard(role: Role): Section {
  return HOME_DASHBOARD[role] ?? 'dashboard';
}

/**
 * Получает домашний модуль для роли (первый доступный)
 */
export function getHomeModule(role: Role): Module {
  const modules = getAvailableModules(role);
  return modules[0] ?? 'control';
}

/**
 * Проверяет, нужен ли редирект при смене роли
 * Возвращает раздел для редиректа или null
 */
export function getRedirectSection(role: Role, currentSection: Section): Section | null {
  if (!hasSectionAccess(role, currentSection)) {
    return getHomeDashboard(role);
  }
  return null;
}

/**
 * Конфигурация модулей для отображения в UI
 */
export interface ModuleConfig {
  id: Module;
  label: string;
  section: Section; // На какой раздел переводит при клике
  icon: string;
}

export const MODULE_CONFIGS: Record<Module, ModuleConfig> = {
  control: {
    id: 'control',
    label: 'Центр управления',
    section: 'dashboard',
    icon: '🎯'
  },
  admin: {
    id: 'admin',
    label: 'Администрирование',
    section: 'admin',
    icon: '⚙️'
  },
  finance: {
    id: 'finance',
    label: 'Финансы',
    section: 'finance',
    icon: '💰'
  },
  warehouse: {
    id: 'warehouse',
    label: 'Склад',
    section: 'warehouse',
    icon: '📦'
  },
  marketing: {
    id: 'marketing',
    label: 'SEO / Маркетинг',
    section: 'marketing',
    icon: '📊'
  },
  support: {
    id: 'support',
    label: 'Поддержка',
    section: 'support',
    icon: '💬'
  },
  partner: {
    id: 'partner',
    label: 'Партнёр',
    section: 'partner',
    icon: '👤'
  }
};
