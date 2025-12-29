import AppRu from './AppRu';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DrilldownProvider } from './components/dashboard/DrilldownProvider'; // 🆕 Drilldown Provider
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 🚀 React Query client для оптимизированных компонентов
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  useEffect(() => {
    // Глобальный обработчик ошибок
    const handleError = (event: ErrorEvent) => {
      console.error('🔥 GLOBAL ERROR:', event.error);
      console.error('🔥 Error message:', event.message);
      console.error('🔥 Error stack:', event.error?.stack);
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🔥 UNHANDLED PROMISE REJECTION:', event.reason);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // 🆕 Log localStorage access_token status on app mount
    const accessToken = localStorage.getItem('access_token');
    const userId = localStorage.getItem('userId');
    console.log('🔐 App startup - Auth status:', {
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length || 0,
      hasUserId: !!userId,
      userId: userId || 'N/A'
    });
    
    console.log('✅ App mounted, global error handlers installed');
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <DrilldownProvider>
          <AppRu />
        </DrilldownProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}