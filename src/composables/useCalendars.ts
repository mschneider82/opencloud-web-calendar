import { ref, readonly } from 'vue'
import { getCalDAVClient } from '../caldav/client'
import type { Calendar } from '../types/calendar'

const calendars = ref<Calendar[]>([])
const loading = ref(false)
const error = ref<Error | null>(null)

export function useCalendars() {
  const client = getCalDAVClient()

  async function loadCalendars(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      calendars.value = await client.discoverCalendars()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load calendars')
      console.error('Failed to load calendars:', err)
    } finally {
      loading.value = false
    }
  }

  function toggleCalendarVisibility(calendarHref: string): void {
    const calendar = calendars.value.find((c) => c.href === calendarHref)
    if (calendar) {
      calendar.visible = !calendar.visible
    }
  }

  function setCalendarVisibility(calendarHref: string, visible: boolean): void {
    const calendar = calendars.value.find((c) => c.href === calendarHref)
    if (calendar) {
      calendar.visible = visible
    }
  }

  function getCalendarByHref(href: string): Calendar | undefined {
    return calendars.value.find((c) => c.href === href)
  }

  function getDefaultCalendar(): Calendar | undefined {
    return calendars.value[0]
  }

  return {
    calendars: readonly(calendars),
    loading: readonly(loading),
    error: readonly(error),
    loadCalendars,
    toggleCalendarVisibility,
    setCalendarVisibility,
    getCalendarByHref,
    getDefaultCalendar
  }
}
