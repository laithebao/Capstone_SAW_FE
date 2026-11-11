import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { Building2, Loader2, Pencil, Save, UserRound } from 'lucide-react'
import FormNotification from '@/components/common/FormNotification'
import { ROUTES } from '@/constants/routes'
import { roleLabels } from '@/features/role-dashboard/roleDashboardConfig'
import { useAuth } from '@/hooks/useAuth'
import { userProfileSchema } from '@/features/auth/schemas/userProfileSchema'
import { getMyProfile, getProfileErrorMessage, updateMyProfile } from '@/services/userProfileService'
import type { UpdateUserProfileRequest, UserProfile } from '@/types/userProfile'
import { getApiFieldErrors, getValidationFieldErrors, type FormFieldErrors } from '@/utils/formErrors'

const fieldLabels = {
  fullName: 'Họ và tên', phoneNumber: 'Số điện thoại cá nhân',
  'distributor.distributorName': 'Tên nhà phân phối', 'distributor.taxCode': 'Mã số thuế',
  'distributor.contactPerson': 'Người liên hệ', 'distributor.phoneNumber': 'Số điện thoại liên hệ',
  'distributor.email': 'Email liên hệ', 'distributor.address': 'Địa chỉ',
}

const inputClass = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600'
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60'
const toRequest = (profile: UserProfile): UpdateUserProfileRequest => ({
  fullName: profile.fullName,
  phoneNumber: profile.phoneNumber,
  distributor: profile.distributor ? {
    distributorName: profile.distributor.distributorName,
    contactPerson: profile.distributor.contactPerson,
    phoneNumber: profile.distributor.phoneNumber,
    email: profile.distributor.email,
    address: profile.distributor.address,
  } : null,
})

export default function UserProfilePage() {
  const { user, updateProfileName } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [draft, setDraft] = useState<UpdateUserProfileRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({})

  useEffect(() => {
    if (user?.role === 'SUPPLIER') return
    const controller = new AbortController()
    void getMyProfile(controller.signal).then(result => {
      if (controller.signal.aborted) return
      setProfile(result)
      setDraft(toRequest(result))
    }).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setError(getProfileErrorMessage(requestError, 'Không thể tải hồ sơ.'))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [user?.id, user?.role, retry])

  if (user?.role === 'SUPPLIER') return <Navigate to={ROUTES.SUPPLIER_PROFILE} replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || saving) return
    const validation = userProfileSchema.safeParse(draft)
    if (!validation.success) {
      setFieldErrors(getValidationFieldErrors(validation.error.issues))
      setError(`${validation.error.issues[0].message} Vui lòng kiểm tra các ô được đánh dấu đỏ.`)
      setMessage('')
      return
    }
    setSaving(true)
    setFieldErrors({})
    setError('')
    setMessage('')
    try {
      const result = await updateMyProfile(validation.data, profile?.distributor?.taxCode)
      setProfile(result)
      setDraft(toRequest(result))
      updateProfileName(result.accountId, result.fullName)
      setEditing(false)
      setMessage('Đã cập nhật hồ sơ thành công.')
    } catch (requestError) {
      const fields = getApiFieldErrors(requestError, fieldLabels)
      setFieldErrors(fields)
      const first = Object.values(fields)[0]
      setError(first ? `${first} Vui lòng kiểm tra các ô được đánh dấu đỏ.` : getProfileErrorMessage(requestError, 'Không thể cập nhật hồ sơ.'))
    } finally { setSaving(false) }
  }

  function changeBusiness(field: keyof NonNullable<UpdateUserProfileRequest['distributor']>, value: string) {
    if (draft?.distributor) changeDraft({ ...draft, distributor: { ...draft.distributor, [field]: value } }, `distributor.${field}`)
  }

  function changeDraft(next: UpdateUserProfileRequest, field: string) {
    setDraft(next)
    if (!fieldErrors[field]) return
    const validation = userProfileSchema.safeParse(next)
    const errors = validation.success ? {} : getValidationFieldErrors(validation.error.issues)
    setFieldErrors(current => {
      const updated = { ...current }
      if (errors[field]) updated[field] = errors[field]
      else delete updated[field]
      return updated
    })
  }

  function focusFirstError() {
    const input = document.getElementById('user-profile-form')?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)')
    input?.focus({ preventScroll: true })
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (loading) return <div role="status" className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-slate-500"><Loader2 className="size-6 animate-spin text-emerald-600" />Đang tải hồ sơ...</div>
  if (!profile || !draft) return <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700"><p>{error || 'Không tìm thấy hồ sơ.'}</p><button type="button" className={`${buttonClass} mt-4 bg-rose-700 text-white`} onClick={() => { setError(''); setLoading(true); setRetry(value => value + 1) }}>Thử lại</button></div>

  const isDistributor = user?.role === 'DISTRIBUTOR'
  const business = draft.distributor
  const fieldProps = (field: string) => ({
    id: `profile-${field}`, 'aria-invalid': Boolean(fieldErrors[field]),
    'aria-describedby': fieldErrors[field] ? `profile-${field}-error` : undefined,
    className: `${inputClass} aria-invalid:border-rose-500 aria-invalid:focus:border-rose-600 aria-invalid:focus:ring-rose-100`,
  })
  const fieldError = (field: string) => fieldErrors[field] && <span id={`profile-${field}-error`} data-field-error={field} className="mt-1.5 block text-sm font-normal text-rose-600">{fieldErrors[field]}</span>
  return <div className="mx-auto max-w-6xl space-y-6">
    <div data-profile-actions className="sticky top-16 z-20 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">{isDistributor ? 'Hồ sơ Nhà phân phối' : 'Hồ sơ cá nhân'}</h1><p className="mt-1 text-sm text-slate-500">Xem và cập nhật thông tin của bạn.</p></div>
      <div className="flex flex-wrap gap-3">
        <Link to={ROUTES.CHANGE_PASSWORD} className={`${buttonClass} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Đổi mật khẩu</Link>
        {!editing && <button type="button" onClick={() => { setEditing(true); setMessage(''); setError(''); setFieldErrors({}) }} className={`${buttonClass} bg-emerald-700 text-white hover:bg-emerald-800`}><Pencil className="size-4" />Chỉnh sửa thông tin</button>}
        {editing && <>
          <button type="button" disabled={saving} onClick={() => { setDraft(toRequest(profile)); setEditing(false); setError(''); setFieldErrors({}); setMessage('') }} className={`${buttonClass} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Hủy thay đổi</button>
          <button type="submit" form="user-profile-form" disabled={saving || (isDistributor && !business)} className={`${buttonClass} bg-emerald-700 text-white hover:bg-emerald-800`}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
        </>}
      </div>
    </div>
    <FormNotification message={error || message} tone={error ? 'error' : 'success'} onDismiss={() => { setError(''); setMessage('') }} onViewErrors={error && Object.keys(fieldErrors).length ? focusFirstError : undefined} />
    <form id="user-profile-form" noValidate onSubmit={event => void submit(event)} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRound className="size-[18px]" /></span><h2 className="text-base font-bold text-slate-900">Thông tin tài khoản</h2></div>
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"><span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-2xl font-bold text-emerald-700">{profile.fullName.charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="break-words text-lg font-bold text-slate-900">{profile.fullName}</p><p className="mt-1 text-sm text-slate-500">{user ? roleLabels[user.role] : ''}</p></div></div>
        <fieldset disabled={!editing || saving} className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">Họ và tên<span className="text-rose-600" aria-hidden="true"> *</span><input name="fullName" required maxLength={150} value={draft.fullName} onChange={event => changeDraft({ ...draft, fullName: event.target.value }, 'fullName')} {...fieldProps('fullName')} autoComplete="name" />{fieldError('fullName')}</label>
          <label className="text-sm font-semibold text-slate-600">Số điện thoại cá nhân<input name="phoneNumber" type="tel" maxLength={30} value={draft.phoneNumber ?? ''} onChange={event => changeDraft({ ...draft, phoneNumber: event.target.value }, 'phoneNumber')} {...fieldProps('phoneNumber')} autoComplete="tel" />{fieldError('phoneNumber')}<span className="mt-1 block text-xs font-normal text-slate-500">10 chữ số bắt đầu bằng 0 hoặc +84 và 9 chữ số.</span></label>
          <label className="text-sm font-semibold text-slate-600">Tên đăng nhập<input value={profile.username} disabled className={inputClass} /></label>
          <label className="text-sm font-semibold text-slate-600">Email đăng nhập<input value={profile.email} disabled className={inputClass} /></label>
        </fieldset>
      </section>
      {isDistributor && business && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Building2 className="size-[18px]" /></span><h2 className="text-base font-bold text-slate-900">Thông tin Nhà phân phối</h2></div>
        <fieldset disabled={!editing || saving} className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">Mã nhà phân phối<input value={profile.distributor?.distributorCode ?? ''} disabled className={inputClass} /></label>
          <label className="text-sm font-semibold text-slate-600">Tên nhà phân phối<span className="text-rose-600" aria-hidden="true"> *</span><input name="distributorName" required maxLength={200} value={business.distributorName} onChange={event => changeBusiness('distributorName', event.target.value)} {...fieldProps('distributor.distributorName')} autoComplete="organization" />{fieldError('distributor.distributorName')}</label>
          <label className="text-sm font-semibold text-slate-600">Mã số thuế / ĐKKD<input name="taxCode" value={profile.distributor?.taxCode ?? ''} readOnly disabled {...fieldProps('distributor.taxCode')} />{fieldError('distributor.taxCode')}<span className="mt-1 block text-xs font-normal text-slate-500">Mã số thuế đã đăng ký không thể thay đổi.</span></label>
          <label className="text-sm font-semibold text-slate-600">Người liên hệ<input name="contactPerson" maxLength={150} value={business.contactPerson ?? ''} onChange={event => changeBusiness('contactPerson', event.target.value)} {...fieldProps('distributor.contactPerson')} />{fieldError('distributor.contactPerson')}</label>
          <label className="text-sm font-semibold text-slate-600">Số điện thoại liên hệ<input name="businessPhoneNumber" type="tel" maxLength={30} value={business.phoneNumber ?? ''} onChange={event => changeBusiness('phoneNumber', event.target.value)} {...fieldProps('distributor.phoneNumber')} />{fieldError('distributor.phoneNumber')}</label>
          <label className="text-sm font-semibold text-slate-600">Email liên hệ<input name="businessEmail" type="email" maxLength={255} value={business.email ?? ''} onChange={event => changeBusiness('email', event.target.value)} {...fieldProps('distributor.email')} />{fieldError('distributor.email')}</label>
          <label className="text-sm font-semibold text-slate-600 md:col-span-2">Địa chỉ trụ sở<textarea name="address" maxLength={500} rows={3} value={business.address ?? ''} onChange={event => changeBusiness('address', event.target.value)} {...fieldProps('distributor.address')} autoComplete="street-address" />{fieldError('distributor.address')}</label>
        </fieldset>
      </section>}
      {isDistributor && !business && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Chưa có hồ sơ nhà phân phối. Vui lòng liên hệ quản trị viên.</p>}
    </form>
  </div>
}
