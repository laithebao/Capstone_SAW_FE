import type { ReactNode } from 'react'

type AuthFieldProps = {
  children: ReactNode
  error?: string
  htmlFor: string
  label: string
}

export default function AuthField({ children, error, htmlFor, label }: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
}
