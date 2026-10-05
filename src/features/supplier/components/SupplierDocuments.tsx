import { useId, useRef, useState } from 'react';
import { Download, FileImage, FileText, Paperclip, Upload } from 'lucide-react';
import type { SupplierDocumentDto } from '@/types/supplier';
import { downloadSupplierDocument, validateSupplierFile } from '../supplierFiles';

export function SupplierDocuments({ documents, variant = 'default' }: {
  documents: SupplierDocumentDto[];
  variant?: 'default' | 'profile';
}) {
  const [error, setError] = useState('');

  if (variant === 'profile') {
    return <div className="space-y-3">
      {documents.length === 0 && <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400">
          <Paperclip className="size-[18px]" aria-hidden="true" />
        </span>
        <p className="text-sm text-gray-500">Không có tài liệu đính kèm.</p>
      </div>}
      {documents.map(doc => {
        const extension = doc.fileName.split('.').pop()?.toUpperCase();
        const isImage = doc.fileType?.startsWith('image/') || ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(extension ?? '');
        const fileType = doc.fileType === 'application/pdf' ? 'PDF' :
          doc.fileType?.startsWith('image/') ? doc.fileType.slice(6).toUpperCase() :
          ['PDF', 'JPG', 'JPEG', 'PNG', 'WEBP'].includes(extension ?? '') ? extension : 'Tài liệu';
        const fileSize = doc.fileSizeMb != null && Number.isFinite(doc.fileSizeMb) && doc.fileSizeMb > 0 ?
          doc.fileSizeMb < 1 ? `${Math.max(1, Math.round(doc.fileSizeMb * 1024))} KB` :
            `${doc.fileSizeMb.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB` : null;
        const Icon = isImage ? FileImage : FileText;

        return <button type="button" key={doc.fileUrl} title={doc.fileName} aria-label={`Tải tài liệu ${doc.fileName}`}
          className="group flex w-full min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:gap-4 sm:p-4 cursor-pointer"
          onClick={() => { setError(''); void downloadSupplierDocument(doc.fileUrl, doc.fileName).catch(e => setError(e instanceof Error ? e.message : 'Không thể tải tài liệu.')); }}>
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${isImage ? 'border-sky-100 bg-sky-50 text-sky-600' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-800 group-hover:text-emerald-800">{doc.fileName}</span>
            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>{fileType}</span>
              {fileSize && <><span aria-hidden="true" className="size-1 rounded-full bg-gray-300" /><span>{fileSize}</span></>}
            </span>
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 transition-colors group-hover:border-emerald-200 group-hover:bg-white group-hover:text-emerald-700 sm:w-auto sm:gap-2 sm:px-3">
            <Download className="size-4" aria-hidden="true" />
            <span className="hidden text-xs font-semibold sm:inline">Tải xuống</span>
          </span>
        </button>;
      })}
      {error && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>;
  }

  return <div className="space-y-2">
    {documents.length === 0 && <p className="text-sm text-gray-500">Không có tài liệu đính kèm.</p>}
    {documents.map(doc => <button type="button" key={doc.fileUrl} className="block text-sm text-blue-600 underline"
      onClick={() => { setError(''); void downloadSupplierDocument(doc.fileUrl, doc.fileName).catch(e => setError(e instanceof Error ? e.message : 'Không thể tải tài liệu.')); }}>
      {doc.fileName}
    </button>)}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}

export function SupplierDocumentEditor({ existing, pending, onExistingChange, onPendingChange, disabled = false, variant = 'default' }: {
  existing: SupplierDocumentDto[]; pending: File[];
  onExistingChange: (documents: SupplierDocumentDto[]) => void;
  onPendingChange: (files: File[]) => void; disabled?: boolean;
  variant?: 'default' | 'profile';
}) {
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadHelpId = useId();
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
    {variant === 'profile' ? <div className="space-y-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4">
      <button type="button" disabled={disabled} aria-describedby={uploadHelpId}
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
        <Upload className="size-4" aria-hidden="true" />
        Thêm tài liệu
      </button>
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" disabled={disabled}
        aria-label="Chọn tài liệu đính kèm" className="hidden"
        onChange={e => { select(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <p id={uploadHelpId} className="text-xs leading-5 text-gray-500">PDF, JPG, PNG · Tối đa 10 MB/file. Có thể chọn nhiều tài liệu.</p>
    </div> : <label className="block">Thêm tài liệu (PDF/JPG/PNG, tối đa 10 MB/file)
      <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" disabled={disabled} className="block mt-2"
        onChange={e => { select(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
    </label>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <p className="text-xs text-gray-500">Thay đổi tài liệu được lưu khi bạn bấm lưu. Nếu upload hoặc lưu thất bại, bản đã lưu vẫn được giữ.</p>
  </div>;
}
