import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Loader2, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import { getMyProfile, getProfileErrorMessage } from '@/services/userProfileService'
import UserProfilePage from '@/pages/auth/UserProfilePage'

export default function DistributorGuard() {
  const { user, logout } = useAuth(), { pathname } = useLocation()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ accountId: number; pathname: string; attempt: number; complete: boolean; error?: string }>()
  useEffect(() => {
    const reload = () => setAttempt(n => n + 1)
    window.addEventListener('saw:profile-updated', reload)
    return () => window.removeEventListener('saw:profile-updated', reload)
  }, [])
  useEffect(() => {
    const controller = new AbortController(), accountId = user!.id
    void getMyProfile(controller.signal).then(profile => {
      if (!controller.signal.aborted) setResult({ accountId, pathname, attempt, complete: profile.isProfileComplete === true })
    }).catch(e => { if (!controller.signal.aborted) setResult({ accountId, pathname, attempt, complete: false, error: getProfileErrorMessage(e, 'Không thể kiểm tra hồ sơ. Vui lòng thử lại.') }) })
    return () => controller.abort()
  }, [user?.id, pathname, attempt])
  if (!result || result.accountId !== user?.id || result.pathname !== pathname || result.attempt !== attempt)
    return <div role="status" className="flex min-h-screen items-center justify-center gap-3 text-slate-500"><Loader2 className="size-5 animate-spin" />Đang kiểm tra hồ sơ nhà phân phối...</div>
  if (result.complete) return <Outlet />
  if (!result.error && pathname !== ROUTES.PROFILE) return <Navigate to={ROUTES.PROFILE} replace />
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8"><div className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-between gap-4"><p className="font-bold text-emerald-800">SAW · Hoàn thiện hồ sơ nhà phân phối</p><button type="button" onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><LogOut size={16} />Đăng xuất</button></div>{result.error ? <div role="alert" className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700"><p>{result.error}</p><button className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-white" onClick={() => setAttempt(n => n + 1)}>Thử lại</button></div> : <UserProfilePage />}</main>
}
