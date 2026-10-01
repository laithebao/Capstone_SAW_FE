/**
 * Cloudinary direct upload helper.
 * File is uploaded from browser directly to Cloudinary (unsigned preset).
 * Only the resulting URL is sent to the backend.
 *
 * Required .env vars:
 *   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   VITE_CLOUDINARY_UPLOAD_PRESET=saw_qc_unsigned
 */

export interface CloudinaryUploadResult {
  url: string       // secure_url from Cloudinary
  publicId: string  // public_id (used for management/deletion)
  fileName: string  // original file name
  mimeType: string
  bytes: number
}

export async function uploadToCloudinary(
  file: File,
  folder: string,
): Promise<CloudinaryUploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string
  const preset    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string

  if (!cloudName || !preset) {
    throw new Error(
      'Cloudinary chưa được cấu hình. Vui lòng thiết lập ' +
      'VITE_CLOUDINARY_CLOUD_NAME và VITE_CLOUDINARY_UPLOAD_PRESET trong .env',
    )
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', preset)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ??
      `Tải ảnh lên Cloudinary thất bại (HTTP ${res.status}).`,
    )
  }

  const data = await res.json() as {
    secure_url: string
    public_id:  string
    bytes:      number
    format:     string
  }

  return {
    url:      data.secure_url,
    publicId: data.public_id,
    fileName: file.name,
    mimeType: file.type || `image/${data.format}`,
    bytes:    data.bytes,
  }
}

/** Returns folder path for a given QC inspection */
export function qcImageFolder(inspectionCode: string): string {
  return `saw-qc/${inspectionCode}`
}

/** Validate file before upload */
export function validateImageFile(file: File): string | null {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_SIZE_MB   = 10

  if (!ALLOWED_TYPES.includes(file.type))
    return `Loại file '${file.type}' không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP.`

  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Tối đa ${MAX_SIZE_MB} MB.`

  return null
}
