import { RefCodeDemo } from './components/RefCodeDemo';
import { LoginDiagnostic } from './components/LoginDiagnostic';
import { ServerHealthCheck } from './components/ServerHealthCheck';
import { PartnerIdDemo } from './components/PartnerIdDemo';
import { RegistrationRu } from './components/RegistrationRu';
import { LoginRu } from './components/LoginRu';
import TelegramWidgetTest from './components/TelegramWidgetTest';
import TelegramDiagnostic from './components/TelegramDiagnostic';
import { AuthDiagnostic } from './components/AuthDiagnostic';
import { ResetPasswordRu } from './components/ResetPasswordRu';
import { MainApp } from './MainApp';

export default function AppRu() {
  // Если URL содержит /partner-id-demo, показываем демо страницу
  if (window.location.pathname === '/partner-id-demo') {
    return <PartnerIdDemo />;
  }
  
  // Если URL содержит /refcode-demo, показываем демо реф-кодов
  if (window.location.pathname === '/refcode-demo') {
    return <RefCodeDemo />;
  }
  
  // Если URL содержит /register, показываем страницу регистрации
  if (window.location.pathname === '/register') {
    return <RegistrationRu />;
  }
  
  // Если URL содержит /login, показываем страницу входа
  if (window.location.pathname === '/login') {
    return <LoginRu />;
  }
  
  // Если URL содержит /test-widget, показываем тестовую страницу
  if (window.location.pathname === '/test-widget') {
    return <TelegramWidgetTest />;
  }
  
  // Если URL содержит /diagnostic, показываем диагностику
  if (window.location.pathname === '/diagnostic') {
    return <TelegramDiagnostic />;
  }
  
  // Если URL содержит /auth-diagnostic, показываем диагностику авторизации
  if (window.location.pathname === '/auth-diagnostic') {
    return <AuthDiagnostic />;
  }
  
  // Если URL содержит /health-check, показываем проверку сервера
  if (window.location.pathname === '/health-check') {
    return <ServerHealthCheck />;
  }
  
  // Если URL содержит /login-diagnostic, показываем диагностику входа
  if (window.location.pathname === '/login-diagnostic') {
    return <LoginDiagnostic />;
  }
  
  // Если URL содержит /reset-password И type=recovery, показываем страницу сброса пароля
  // НЕ показываем для OAuth callback (без type=recovery)!
  if (window.location.pathname === '/reset-password' && window.location.hash.includes('type=recovery')) {
    return <ResetPasswordRu />;
  }
  
  return <MainApp />;
}