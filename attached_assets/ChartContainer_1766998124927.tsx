import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { BarChart3 } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  error?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  actions,
  loading = false,
  empty = false,
  error = false,
  emptyMessage = 'Нет данных для отображения',
  errorMessage = 'Ошибка загрузки данных',
}: ChartContainerProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-[#6B7280] mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="shrink-0 ml-4">{actions}</div>}
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#39B7FF] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#6B7280]">Загрузка данных...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1E1E1E] mb-1">
                  {errorMessage}
                </p>
                <p className="text-xs text-[#6B7280]">
                  Попробуйте обновить страницу
                </p>
              </div>
            </div>
          </div>
        )}

        {empty && !loading && !error && (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1E1E1E] mb-1">
                  {emptyMessage}
                </p>
                <p className="text-xs text-[#6B7280]">
                  Данные появятся после первых транзакций
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !empty && children}
      </CardContent>
    </Card>
  );
}
