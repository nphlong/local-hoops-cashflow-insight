export interface AuthUser {
  email: string
  name: string
  picture: string
  exp: number
}

export type CredentialResponse = { credential: string; select_by?: string }

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (res: CredentialResponse) => void
            ux_mode?: 'popup' | 'redirect'
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

export const googleClientId = () => (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()

export const allowedEmails = () =>
  (import.meta.env.VITE_GOOGLE_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

export const googleConfigError = (): string | null => {
  if (!googleClientId()) return 'Google sign-in is not configured (missing client ID).'
  if (!allowedEmails().length) return 'Google sign-in is not configured (no allowlisted emails).'
  return null
}

let gisLoad: Promise<void> | null = null

export const loadGisScript = (): Promise<void> => {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gisLoad) return gisLoad
  gisLoad = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      gisLoad = null
      reject(new Error('Failed to load Google Sign-In.'))
    }
    document.head.appendChild(script)
  })
  return gisLoad
}

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) throw new Error('Google session is invalid or expired.')
  const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const bytes = Uint8Array.from(atob(padded + pad), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
}

export const userFromCredential = (credential: string): AuthUser => {
  const clientId = googleClientId()
  const allow = allowedEmails()
  const payload = decodeJwtPayload(credential)
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const name = typeof payload.name === 'string' ? payload.name : email
  const picture = typeof payload.picture === 'string' ? payload.picture : ''
  const exp = typeof payload.exp === 'number' ? payload.exp : 0
  const aud = typeof payload.aud === 'string' ? payload.aud : ''
  const iss = typeof payload.iss === 'string' ? payload.iss : ''

  if (aud !== clientId || !ISSUERS.has(iss) || exp * 1000 <= Date.now()) {
    throw new Error('Google session is invalid or expired.')
  }
  if (payload.email_verified !== true || !email) {
    throw new Error('Google session is invalid or expired.')
  }
  if (!allow.includes(email)) {
    throw new Error('This Google account is not authorized for this dashboard.')
  }
  return { email, name, picture, exp }
}

export const initializeGisButton = async (
  host: HTMLElement,
  onCredential: (credential: string) => void,
) => {
  const clientId = googleClientId()
  if (!clientId) throw new Error('Google sign-in is not configured (missing client ID).')
  await loadGisScript()
  const gis = window.google?.accounts.id
  if (!gis) throw new Error('Failed to load Google Sign-In.')
  gis.initialize({
    client_id: clientId,
    callback: (res) => {
      if (res.credential) onCredential(res.credential)
    },
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
  })
  host.replaceChildren()
  gis.renderButton(host, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'pill',
    width: 280,
  })
}

export const disableGisAutoSelect = () => {
  window.google?.accounts.id.disableAutoSelect()
}
