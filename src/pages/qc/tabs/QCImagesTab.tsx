import { useRef, useState } from 'react'
import { getAuthErrorMessage } from '@/services/authService'
import { uploadToCloudinary, validateImageFile, qcImageFolder } from '@/utils/cloudinaryUpload'
import type { QcInspectionDetailDto, QualityImageDto, UploadQualityImageRequest } from '@/types/inspection'

interface Props {
  inspection: QcInspectionDetailDto
  disabled: boolean
  onSaved: () => Promise<void>
  addImage: (inspectionId: number, req: UploadQualityImageRequest) => Promise<QualityImageDto>
  deleteImage: (inspectionId: number, imageId: number) => Promise<void>
}

export default function QCImagesTab({ inspection, disabled, onSaved, addImage, deleteImage }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting,  setDeleting]  = useState<number | null>(null)
  const [error,     setError]     = useState('')
  const [progress,  setProgress]  = useState(0)

  const images = inspection.images
  const canUpload = !disabled && images.length < 20

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-selected

    // Validate
    const validationError = validateImageFile(file)
    if (validationError) { setError(validationError); return }

    setError('')
    setUploading(true)
    setProgress(10)

    try {
      // 1. Upload to Cloudinary
      const folder = qcImageFolder(inspection.inspectionCode)
      setProgress(30)
      const cloudResult = await uploadToCloudinary(file, folder)
      setProgress(70)

      // 2. Save metadata to BE
      await addImage(inspection.id, {
        fileName: cloudResult.fileName,
        fileUrl:  cloudResult.url,
        mimeType: cloudResult.mimeType,
      })
      setProgress(100)

      // 3. Reload
      await onSaved()
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Tải ảnh lên thất bại. Vui lòng thử lại.'))
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  async function handleDelete(imageId: number, fileName: string) {
    if (!confirm(`Xóa ảnh "${fileName}"?`)) return
    setDeleting(imageId)
    setError('')
    try {
      await deleteImage(inspection.id, imageId)
      await onSaved()
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể xóa ảnh.'))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">
          📸 Ảnh bằng chứng chất lượng
          <span className="ml-2 text-xs font-normal text-slate-400">({images.length}/20)</span>
        </h2>
        {canUpload && (
          <>
            <button
              id="btn-upload-image"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {uploading ? '⏳ Đang tải...' : '↑ Tải ảnh lên'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
        💡 Ảnh được tải lên Cloudinary trực tiếp. Chỉ chấp nhận JPG, PNG, WEBP. Tối đa 10MB/ảnh, 20 ảnh/phiếu.
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Upload progress */}
      {uploading && progress > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Đang tải lên Cloudinary...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Image grid */}
      {images.length === 0 ? (
        <div
          onClick={canUpload ? () => fileInputRef.current?.click() : undefined}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-14 text-center transition-colors ${
            canUpload ? 'cursor-pointer border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30' : 'border-slate-200'
          }`}
        >
          <span className="text-5xl">📷</span>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {canUpload ? 'Nhấn để tải ảnh bằng chứng lên' : 'Chưa có ảnh nào'}
          </p>
          {canUpload && <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP · tối đa 10MB</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map(img => (
            <div key={img.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <a href={img.fileUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={img.fileUrl}
                  alt={img.fileName}
                  className="h-44 w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </a>
              <div className="p-3">
                <p className="truncate text-xs font-semibold text-slate-700">{img.fileName}</p>
                <p className="text-[10px] text-slate-400">
                  {img.uploadedByName} · {new Date(img.uploadedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              {!disabled && (
                <button
                  disabled={deleting === img.id}
                  onClick={() => void handleDelete(img.id, img.fileName)}
                  className="absolute right-2 top-2 rounded-full bg-rose-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-700 disabled:opacity-50"
                  title="Xóa ảnh"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          {/* Upload card */}
          {canUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-44 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-emerald-400 hover:bg-emerald-50/30 hover:text-emerald-600"
            >
              <span className="text-3xl">＋</span>
              <span className="mt-2 text-xs font-semibold">Thêm ảnh</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
