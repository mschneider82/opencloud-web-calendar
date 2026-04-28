import { useAuthStore } from '@opencloud-eu/web-pkg'
import { isRef } from 'vue'
import { CalDAVError } from './errors'

let authStore: ReturnType<typeof useAuthStore> | null = null

export function initAuthStore(store: ReturnType<typeof useAuthStore>): void {
  authStore = store
}

export function getAccessToken(): string | null {
  if (!authStore) return null
  const store = authStore as unknown as Record<string, unknown>
  return readStringMaybeRef(store.accessToken)
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken()
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

export function getUserId(): string | null {
  if (!authStore) return null
  const store = authStore as unknown as Record<string, unknown>
  const userInfo = unwrapMaybeRef(store.userInfo)
  if (!userInfo || typeof userInfo !== 'object') return null

  const info = userInfo as Record<string, unknown>
  return (
    readStringMaybeRef(info.id) ||
    readStringMaybeRef(info.mail) ||
    readStringMaybeRef(info.username) ||
    readStringMaybeRef(info.email)
  )
}

export function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const normalizedUrl = normalizeCalDAVUrl(url)
  const headers = new Headers(options.headers)

  // For CalDAV through OpenCloud proxy, we need X-Remote-User instead of Bearer token
  const userId = getUserId()
  if (userId) {
    assertSafeHeaderValue('X-Remote-User', userId)
    headers.set('X-Remote-User', userId)
  }

  // Also include Bearer token for OpenCloud proxy authentication
  const token = getAccessToken()
  if (token) {
    assertSafeHeaderValue('Authorization', token)
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(normalizedUrl, {
    ...options,
    headers,
    credentials: 'include'
  })
}

function normalizeCalDAVUrl(url: string): string {
  if (!url || !url.trim()) {
    throw new CalDAVError('Invalid CalDAV URL')
  }

  const origin = getCurrentOrigin()
  const parsed = new URL(url, origin)

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new CalDAVError('Unsupported CalDAV URL protocol')
  }

  if (parsed.origin !== origin) {
    throw new CalDAVError('Refusing cross-origin CalDAV request')
  }

  if (!(parsed.pathname === '/caldav' || parsed.pathname.startsWith('/caldav/'))) {
    throw new CalDAVError('Refusing request outside CalDAV endpoint')
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

function getCurrentOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost'
}

function assertSafeHeaderValue(headerName: string, value: string): void {
  if (/[\r\n]/.test(value)) {
    throw new CalDAVError(`Invalid ${headerName} header value`)
  }
}

function unwrapMaybeRef(value: unknown): unknown {
  return isRef(value) ? value.value : value
}

function readStringMaybeRef(value: unknown): string | null {
  const unwrapped = unwrapMaybeRef(value)
  return typeof unwrapped === 'string' && unwrapped.length > 0 ? unwrapped : null
}
