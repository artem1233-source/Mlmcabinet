import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TableData } from './types';

interface DataTableProps {
  title?: string;
  data: TableData;
}

export function DataTable({ title, data }: DataTableProps) {
  const { columns, rows } = data;

  if (!rows || rows.length === 0) {
    return (
      <Card className="border-gray-200">
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-gray-500 text-sm py-4 text-center">Нет данных для отображения</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-gray-700 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
