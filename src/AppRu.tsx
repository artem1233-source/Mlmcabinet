import { useState } from 'react';
import { RefCodeDemo } from './components/RefCodeDemo';
import { LoginDiagnostic } from './components/LoginDiagnostic';
import { ServerHealthCheck } from './components/ServerHealthCheck';
import { PartnerIdDemo } from './components/PartnerIdDemo';
import TelegramWidgetTest from './components/TelegramWidgetTest';
import TelegramDiagnostic from './components/TelegramDiagnostic';
import { AuthDiagnostic } from './components/AuthDiagnostic';
import { ResetPasswordRu } from './components/ResetPasswordRu';
import { MainApp } from './MainApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EmailDiagnostic } from './components/EmailDiagnostic';
import { AdminRightsDiagnostic } from './components/AdminRightsDiagnostic';
import { Toaster } from './components/ui/sonner';

export default function AppRu() {
  const currentPath = window.location.pathname;
  console.log('🔵 AppRu rendering, pathname:', currentPath);
  console.log('🔵 Full URL:', window.location.href);
  
  // State для управления экранами аутентификации (только для главной страницы)
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  console.log('🔵 AppRu: authScreen state =', authScreen);
  
  // Если URL содержит /email-diagnostic, показываем диагностику email
  if (currentPath === '/email-diagnostic') {
    return <EmailDiagnostic />;
  }
  
  // Если URL содержит /admin-diagnostic, показываем диагностику админских прав
  if (currentPath === '/admin-diagnostic') {
    return <AdminRightsDiagnostic />;
  }
  
  // Если URL содержит /partner-id-demo, показываем демо страницу
  if (currentPath === '/partner-id-demo') {
    return <PartnerIdDemo />;
  }
  
  // Если URL содержит /refcode-demo, показываем демо реф-кодов
  if (currentPath === '/refcode-demo') {
    return <RefCodeDemo />;
  }
  
  // Если URL содержит /test-widget, показываем тестовую страницу
  if (currentPath === '/test-widget') {
    return <TelegramWidgetTest />;
  }
  
  // Если URL содержит /diagnostic, показываем диагностику
  if (currentPath === '/diagnostic') {
    return <TelegramDiagnostic />;
  }
  
  // Если URL содержит /auth-diagnostic, показываем диагностику авторизации
  if (currentPath === '/auth-diagnostic') {
    return <AuthDiagnostic />;
  }
  
  // Если URL содержит /health-check, показываем проверку сервера
  if (currentPath === '/health-check') {
    return <ServerHealthCheck />;
  }
  
  // Если URL содержит /login-diagnostic, показываем диагностику входа
  if (currentPath === '/login-diagnostic') {
    return <LoginDiagnostic />;
  }
  
  // Если URL содержит /reset-password И type=recovery, показываем страницу сброса пароля
  // НЕ показываем для OAuth callback (без type=recovery)!
  if (currentPath === '/reset-password' && window.location.hash.includes('type=recovery')) {
    return <ResetPasswordRu />;
  }
  
  // Для ВСЕХ остальных путей (включая /, /login, /register) показываем MainApp
  console.log('✅ Rendering MainApp with ErrorBoundary');
  return (
    <>
      <ErrorBoundary>
        <MainApp 
          authScreen={authScreen} 
          setAuthScreen={setAuthScreen}
        />
      </ErrorBoundary>
      <Toaster position="bottom-right" richColors closeButton expand={true} />
    </>
  );
}