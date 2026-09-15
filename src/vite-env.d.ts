/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface GoogleCredentialResponse { credential: string }
interface Window {
  google?: { accounts: { id: {
    initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void
    renderButton: (element: HTMLElement, options: Record<string, string>) => void
    disableAutoSelect: () => void
  } } }
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
