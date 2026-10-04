import { useState } from 'react';
import type { SupplierDocumentDto } from '@/types/supplier';
import { downloadSupplierDocument, validateSupplierFile } from '../supplierFiles';

export function SupplierDocuments({ documents }: { documents: SupplierDocumentDto[] }) {
  const [error, setError] = useState('');
  return <div className="space-y-2">
    {documents.length === 0 && <p className="text-sm text-gray-500">Không có tài liệu đính kèm.</p>}
    {documents.map(doc => <button type="button" key={doc.fileUrl} className="block text-sm text-blue-600 underline"
      onClick={() => { setError(''); void downloadSupplierDocument(doc.fileUrl, doc.fileName).catch(e => setError(e instanceof Error ? e.message : 'Không thể tải tài liệu.')); }}>
      {doc.fileName}
    </button>)}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}

export function SupplierDocumentEditor({ existing, pending, onExistingChange, onPendingChange, disabled = false }: {
  existing: SupplierDocumentDto[]; pending: File[];
  onExistingChange: (documents: SupplierDocumentDto[]) => void;
  onPendingChange: (files: File[]) => void; disabled?: boolean;
}) {
  const [error, setError] = useState('');
  function select(files: File[], replaceUrl?: string) {
    const invalid = files.map(file => validateSupplierFile(file)).find(Boolean);
    if (invalid) { setError(invalid); return; }
    setError('');
    if (replaceUrl) onExistingChange(existing.filter(doc => doc.fileUrl !== replaceUrl));
    onPendingChange([...pending, ...files]);
  }
  return <div className="space-y-3 text-sm">
    <SupplierDocuments documents={existing} />
    {existing.map(doc => <div key={doc.fileUrl} className="flex flex-wrap items-center gap-3 rounded border p-2">
      <span className="flex-1 truncate">{doc.fileName}</span>
      <label className={disabled ? 'text-gray-400' : 'cursor-pointer text-blue-600'}>Thay file
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" disabled={disabled}
          onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) select(files, doc.fileUrl); e.target.value = ''; }} />
      </label>
      <button type="button" disabled={disabled} className="text-red-600" onClick={() => onExistingChange(existing.filter(item => item.fileUrl !== doc.fileUrl))}>Gỡ file</button>
    </div>)}
    {pending.map((file, index) => <div key={`${index}-${file.name}`} className="flex gap-3">
      <span>{file.name} (chưa lưu)</span>
      <button type="button" disabled={disabled} className="text-red-600" onClick={() => onPendingChange(pending.filter((_, i) => i !== index))}>Bỏ file</button>
    </div>)}
    <label className="block">Thêm tài liệu (PDF/JPG/PNG, tối đa 10 MB/file)
      <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" disabled={disabled} className="block mt-2"
        onChange={e => { select(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
    </label>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <p className="text-xs text-gray-500">Thay đổi tài liệu được lưu khi bạn bấm lưu. Nếu upload hoặc lưu thất bại, bản đã lưu vẫn được giữ.</p>
  </div>;
}
