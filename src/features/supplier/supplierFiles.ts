import { apiClient } from '@/services/apiClient';

export function supplierAssetUrl(url: string): string {
  if (!url.startsWith('/api/')) return url;
  return new URL(apiClient.defaults.baseURL ?? 'http://localhost:5252/api', window.location.origin).origin + url;
}

export function validateSupplierFile(file: File, avatar = false): string | null {
  const types = avatar ? ['image/jpeg', 'image/png', 'image/webp'] : ['application/pdf', 'image/jpeg', 'image/png'];
  if (!types.includes(file.type)) return avatar ? 'Ảnh đại diện chỉ hỗ trợ JPG, PNG, WEBP.' : 'Tài liệu chỉ hỗ trợ PDF, JPG, PNG.';
  if (file.size === 0 || file.size > 10 * 1024 * 1024) return 'File phải có dữ liệu và không vượt quá 10 MB.';
  return null;
}

export async function uploadSupplierFile(file: File, avatar = false): Promise<string> {
  const error = validateSupplierFile(file, avatar);
  if (error) throw new Error(error);
  const data = new FormData();
  data.append('file', file);
  const response = await apiClient.post<{ url: string }>('/supplier-files', data, {
    params: { purpose: avatar ? 'AVATAR' : 'DOCUMENT' },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.url;
}

export async function downloadSupplierDocument(url: string, fileName: string): Promise<void> {
  if (!url.startsWith('/api/supplier-files/')) {
    const target = new URL(url, window.location.origin);
    if (!['https:', 'http:'].includes(target.protocol)) throw new Error('Đường dẫn tài liệu không hợp lệ.');
    window.open(target.href, '_blank', 'noopener,noreferrer');
    return;
  }
  const response = await apiClient.get<Blob>(url.substring(4), { responseType: 'blob' });
  const href = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
