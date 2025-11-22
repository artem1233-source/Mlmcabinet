import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loadDemoDataFromStorage } from '../utils/demoData';

interface DemoUserContextType {
  isDemoMode: boolean;
  currentUserId: string | null;
  setCurrentUserId: (userId: string) => void;
  currentUser: any | null;
  refreshUser: () => void;
}

const DemoUserContext = createContext<DemoUserContextType | undefined>(undefined);

const DEMO_USER_KEY = 'demo_view_as_user_id';

export function DemoUserProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Инициализация при загрузке
  useEffect(() => {
    const demoData = loadDemoDataFromStorage();
    
    if (demoData) {
      setIsDemoMode(true);
      
      // Пытаемся загрузить сохраненного пользователя из localStorage
      const savedUserId = localStorage.getItem(DEMO_USER_KEY);
      
      if (savedUserId) {
        const user = demoData.users.find((u: any) => u.id === savedUserId);
        if (user) {
          setCurrentUserIdState(savedUserId);
          setCurrentUser(user);
          return;
        }
      }
      
      // Если нет сохраненного или он не найден, берем главного админа
      const mainUser = demoData.users.find((u: any) => u.id === 'DEMO_USER');
      if (mainUser) {
        setCurrentUserIdState(mainUser.id);
        setCurrentUser(mainUser);
        localStorage.setItem(DEMO_USER_KEY, mainUser.id);
      }
    } else {
      setIsDemoMode(false);
    }
  }, []);

  const setCurrentUserId = (userId: string) => {
    console.log('🎭 DemoContext: Switching to user:', userId);
    
    const demoData = loadDemoDataFromStorage();
    if (!demoData) return;
    
    const user = demoData.users.find((u: any) => u.id === userId);
    if (user) {
      setCurrentUserIdState(userId);
      setCurrentUser(user);
      localStorage.setItem(DEMO_USER_KEY, userId);
      console.log('✅ DemoContext: User switched to:', user.имя, user.фамилия);
    } else {
      console.error('❌ DemoContext: User not found:', userId);
    }
  };

  const refreshUser = () => {
    if (!currentUserId) return;
    
    const demoData = loadDemoDataFromStorage();
    if (!demoData) return;
    
    const user = demoData.users.find((u: any) => u.id === currentUserId);
    if (user) {
      setCurrentUser(user);
    }
  };

  return (
    <DemoUserContext.Provider
      value={{
        isDemoMode,
        currentUserId,
        setCurrentUserId,
        currentUser,
        refreshUser
      }}
    >
      {children}
    </DemoUserContext.Provider>
  );
}

export function useDemoUser() {
  const context = useContext(DemoUserContext);
  if (context === undefined) {
    throw new Error('useDemoUser must be used within a DemoUserProvider');
  }
  return context;
}
