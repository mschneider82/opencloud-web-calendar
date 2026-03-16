import { useAuthStore } from '@opencloud-eu/web-pkg'
import { isRef } from 'vue'

let authStore: ReturnType<typeof useAuthStore> | null = null

export function initAuthStore(store: ReturnType<typeof useAuthStore>): void {
  authStore = store
}

export function getAccessToken(): string | null {
  if (!authStore) return null
  const token = authStore.accessToken
  // Handle both Ref and plain value
  return isRef(token) ? token.value : token
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
  const userInfo = authStore.userInfo
  if (!userInfo) return null
  // Handle Ref
  const info = isRef(userInfo) ? userInfo.value : userInfo
  // Try different properties that might contain the user ID
  return info?.id || info?.mail || info?.username || info?.email || null
}

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)

  // For CalDAV through OpenCloud proxy, we need X-Remote-User instead of Bearer token
  const userId = getUserId()
  if (userId) {
    headers.set('X-Remote-User', userId)
  }

  // Also include Bearer token for OpenCloud proxy authentication
  const token = getAccessToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  })
}
