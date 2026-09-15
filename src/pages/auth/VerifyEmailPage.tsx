import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getApiErrorMessage, verifyEmail } from '@/services/authService'

type VerificationStatus = 'verifying' | 'success' | 'error'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<VerificationStatus>(token ? 'verifying' : 'error')
  const [message, setMessage] = useState(
    token ? 'Đang xác minh email...' : 'Link xác minh không chứa token.',
  )

  useEffect(() => {
    if (!token) return

    let isActive = true
    verifyEmail(token)
      .then(() => {
        if (!isActive) return
        setStatus('success')
        setMessage('Email đã được xác minh thành công. Bạn có thể đăng nhập.')
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setStatus('error')
        setMessage(getApiErrorMessage(error))
      })

    return () => {
      isActive = false
    }
  }, [token])

  return (
    <section className="mx-auto max-w-md rounded-lg border p-6 text-center shadow-sm">
      <h1>Xác minh email</h1>
      <p
        role={status === 'error' ? 'alert' : undefined}
        className={`mt-4 text-sm ${status === 'error' ? 'text-red-700' : 'text-gray-700'}`}
      >
        {message}
      </p>
      {status === 'success' && (
        <Link className="mt-5 inline-block rounded bg-green-700 px-4 py-2 text-white" to={ROUTES.LOGIN}>
          Đi đến đăng nhập
        </Link>
      )}
    </section>
  )
}
