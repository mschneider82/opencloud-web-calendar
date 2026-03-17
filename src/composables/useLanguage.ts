import { computed } from 'vue'
import { useUserStore } from '@opencloud-eu/web-pkg'
import {
  translations,
  supportedLanguages,
  defaultLanguage,
  type SupportedLanguage
} from '../i18n/translations'

// Singleton state for language
let currentLanguage: SupportedLanguage = defaultLanguage

/**
 * Detects the user's preferred language from multiple sources:
 * 1. OpenCloud user profile (preferredLanguage)
 * 2. Browser language setting
 * 3. Falls back to English
 */
function detectLanguage(userPreferredLanguage?: string): SupportedLanguage {
  // 1. Check OpenCloud user profile language
  if (userPreferredLanguage) {
    const shortLang = userPreferredLanguage.split('-')[0].toLowerCase()
    if (supportedLanguages.includes(shortLang as SupportedLanguage)) {
      return shortLang as SupportedLanguage
    }
  }

  // 2. Check browser language
  const browserLang = navigator.language || (navigator as any).userLanguage || ''
  if (browserLang) {
    const shortLang = browserLang.split('-')[0].toLowerCase()
    if (supportedLanguages.includes(shortLang as SupportedLanguage)) {
      return shortLang as SupportedLanguage
    }
  }

  // 3. Default to English
  return defaultLanguage
}

/**
 * Initialize language from OpenCloud user profile
 * Call this early in the app lifecycle
 */
export function initLanguage(): SupportedLanguage {
  try {
    const userStore = useUserStore()
    currentLanguage = detectLanguage(userStore.user?.preferredLanguage)
  } catch {
    // userStore might not be available yet, use browser detection
    currentLanguage = detectLanguage()
  }
  return currentLanguage
}

/**
 * Get current language
 */
export function getLanguage(): SupportedLanguage {
  return currentLanguage
}

/**
 * Translate a string to the current language
 */
export function t(key: string, params?: Record<string, string>): string {
  const langStrings = translations[currentLanguage] || translations[defaultLanguage]
  let translated = (langStrings as Record<string, string>)[key] || key

  // Replace parameters like %{name}
  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      translated = translated.replace(new RegExp(`%\\{${paramKey}\\}`, 'g'), value)
    }
  }

  return translated
}

/**
 * Composable for using translations in Vue components
 */
export function useLanguage() {
  const userStore = useUserStore()

  const language = computed<SupportedLanguage>(() => {
    // Re-detect when user changes (reactive)
    return detectLanguage(userStore.user?.preferredLanguage)
  })

  // Update singleton when language changes
  const updateLanguage = () => {
    currentLanguage = language.value
  }

  return {
    language,
    t,
    updateLanguage
  }
}

/**
 * Get FullCalendar locale string
 */
export function getFullCalendarLocale(): string {
  return currentLanguage
}
