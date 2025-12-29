interface ExportData {
  kpis?: Array<{ title: string; value: number | string; period?: string }>;
  charts?: Array<{ name: string; data: any[] }>;
}

function convertToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToCSV(data: any[], filename: string = 'export.csv'): void {
  convertToCSV(data, filename);
}

export function exportToPDF(_element: HTMLElement, _filename: string = 'export.pdf'): void {
  console.log('PDF export stub - implement with jspdf/html2canvas');
}

export const dashboardExporters = {
  ceo: (data: ExportData) => {
    const rows = data.kpis?.map(kpi => ({
      Показатель: kpi.title,
      Значение: kpi.value,
      Период: kpi.period || '30 дней',
    })) || [];
    convertToCSV(rows, 'ceo-dashboard.csv');
  },
  
  admin: (data: ExportData) => {
    const rows = data.kpis?.map(kpi => ({
      Показатель: kpi.title,
      Значение: kpi.value,
      Период: kpi.period || '30 дней',
    })) || [];
    convertToCSV(rows, 'admin-dashboard.csv');
  },
  
  finance: (data: ExportData) => {
    const rows = data.kpis?.map(kpi => ({
      Показатель: kpi.title,
      Значение: kpi.value,
      Период: kpi.period || '30 дней',
    })) || [];
    convertToCSV(rows, 'finance-dashboard.csv');
  },
  
  warehouse: (data: ExportData) => {
    const rows = data.kpis?.map(kpi => ({
      Показатель: kpi.title,
      Значение: kpi.value,
      Период: kpi.period || '30 дней',
    })) || [];
    convertToCSV(rows, 'warehouse-dashboard.csv');
  },
  
  seo: (data: ExportData) => {
    const rows = data.kpis?.map(kpi => ({
      Показатель: kpi.title,
      Значение: kpi.value,
      Период: kpi.period || '30 дней',
    })) || [];
    convertToCSV(rows, 'seo-dashboard.csv');
  },
  
  support: (data: ExportData) => {
    const rows = data.kpis?.map(kpi => ({
      Показатель: kpi.title,
      Значение: kpi.value,
      Период: kpi.period || '30 дней',
    })) || [];
    convertToCSV(rows, 'support-dashboard.csv');
  },
};
