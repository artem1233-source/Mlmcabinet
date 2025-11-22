import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearData = () => {
    if (confirm('Очистить все локальные данные и перезагрузить страницу?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>

            {/* Title */}
            <h1 className="text-[#1E1E1E] text-center mb-4" style={{ fontSize: '24px', fontWeight: '700' }}>
              Произошла ошибка
            </h1>

            {/* Description */}
            <p className="text-[#666] text-center mb-6" style={{ fontSize: '16px' }}>
              Приложение столкнулось с непредвиденной ошибкой. Попробуйте перезагрузить страницу или очистить данные.
            </p>

            {/* Error Details */}
            {this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800 mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                  Техническая информация:
                </p>
                <p className="text-red-700 text-sm font-mono break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-red-700 text-sm cursor-pointer hover:text-red-800">
                      Показать стек вызовов
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 overflow-x-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6] text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                style={{ fontWeight: '600' }}
              >
                <RefreshCw className="w-5 h-5" />
                <span>Перезагрузить страницу</span>
              </button>
              
              <button
                onClick={this.handleClearData}
                className="flex-1 py-3 px-6 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                style={{ fontWeight: '600' }}
              >
                Очистить данные
              </button>
            </div>

            {/* Help Text */}
            <p className="text-[#999] text-center mt-6" style={{ fontSize: '13px' }}>
              Если проблема повторяется, откройте консоль браузера (F12) и сообщите об ошибке администратору.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
