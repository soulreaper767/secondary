import { api } from '../api/client';

export async function downloadReport(path: string, params: Record<string, any>, format: 'xlsx' | 'pdf') {
  const response = await api.get(path, { params: { ...params, format }, responseType: 'blob' });
  const mime = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
  const blob = new Blob([response.data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cd = response.headers['content-disposition'] as string | undefined;
  const match = cd && /filename="(.+)"/.exec(cd);
  a.download = match ? match[1] : `report.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
