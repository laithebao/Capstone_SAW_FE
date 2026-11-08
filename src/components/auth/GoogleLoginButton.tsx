import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ROLE_HOME_ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { getAuthErrorMessage, loginWithGoogle } from '@/services/authService'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export default function GoogleLoginButton() {
  const buttonContainer = useRef<HTMLDivElement>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [roleId, setRoleId] = useState(5)
  const [error, setError] = useState<string | null>(null)
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const completeGoogleLogin = useCallback(async (token: string, selectedRoleId?: number) => {
    setError(null)
    setVerificationMessage(null)
    setIsSubmitting(true)
    try {
      const result = await loginWithGoogle(token, selectedRoleId)
      if (result.requiresRole || !result.session) {
        setIdToken(token)
        return
      }
      login(result.session)
      navigate(ROLE_HOME_ROUTES[result.session.user.role], { replace: true })
    } catch (requestError) {
      const message = getAuthErrorMessage(requestError, 'Đăng nhập Google không thành công.')
      if (message.includes('xác nhận email')) { setVerificationMessage(message); setIdToken(null) }
      else setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [login, navigate])

  useEffect(() => {
    if (!googleClientId || !buttonContainer.current) return
    const container = buttonContainer.current
    let active = true
    let observedFrame: HTMLIFrameElement | null = null
    const onReady = () => { if (active) setGoogleReady(true) }
    const sizeObserver = new ResizeObserver(() => {
      if (observedFrame && observedFrame.offsetWidth > 0 && observedFrame.offsetHeight > 0) onReady()
    })
    const mutationObserver = new MutationObserver(() => {
      const frame = container.querySelector('iframe')
      if (!frame || frame === observedFrame) return
      if (observedFrame) sizeObserver.unobserve(observedFrame)
      observedFrame = frame
      sizeObserver.observe(frame)
    })
    mutationObserver.observe(container, { childList: true, subtree: true })
    const cleanup = () => {
      active = false
      mutationObserver.disconnect()
      sizeObserver.disconnect()
    }
    const render = () => {
      if (!window.google || !buttonContainer.current) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => void completeGoogleLogin(response.credential),
      })
      buttonContainer.current.replaceChildren()
      window.google.accounts.id.renderButton(buttonContainer.current, {
        theme: 'outline',
        size: 'large',
        width: buttonContainer.current.clientWidth,
        text: 'signin_with',
        locale: 'vi',
      })
    }

    if (window.google) {
      render()
      return cleanup
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = render
    script.onerror = () => setError('Không tải được dịch vụ đăng nhập Google.')
    document.head.appendChild(script)
    return () => { cleanup(); script.remove() }
  }, [completeGoogleLogin])

  if (!googleClientId) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Chưa cấu hình VITE_GOOGLE_CLIENT_ID.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative min-h-11 w-full">
        {!googleReady && <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded border border-slate-200 bg-white" />}
        <div ref={buttonContainer} className={`flex min-h-11 w-full justify-center transition-opacity duration-300 motion-reduce:transition-none ${googleReady ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      </div>
      {idToken && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-xs font-semibold text-emerald-900">Tài khoản mới: chọn vai trò</p>
          <div className="flex gap-2">
            <select value={roleId} onChange={(event) => setRoleId(Number(event.target.value))} className="h-10 flex-1 rounded-lg border border-emerald-200 bg-white px-3 text-sm">
              <option value={5}>Nhà cung cấp</option>
              <option value={6}>Nhà phân phối</option>
            </select>
            <button type="button" disabled={isSubmitting} onClick={() => void completeGoogleLogin(idToken, roleId)} className="rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60">
              Tiếp tục
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
      {verificationMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{verificationMessage}</p>}
    </div>
  )
}
