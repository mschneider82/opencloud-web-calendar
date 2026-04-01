import { ref, onMounted, onUnmounted } from 'vue'

const isDark = ref(false)

function detectTheme(): boolean {
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--oc-role-background')
    .trim()
    .toLowerCase()

  return bg === '#191c1d'
}

function applyThemeAttribute() {
  document.documentElement.setAttribute(
    'data-calendar-theme',
    isDark.value ? 'dark' : 'light'
  )
}

export function useTheme() {
  let observer: MutationObserver | null = null

  function update() {
    isDark.value = detectTheme()
    applyThemeAttribute()
  }

  onMounted(() => {
    update()

    // Watch for style attribute changes on <html> (theme switches)
    observer = new MutationObserver(() => update())
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    })
  })

  onUnmounted(() => {
    observer?.disconnect()
    document.documentElement.removeAttribute('data-calendar-theme')
  })

  return { isDark }
}
