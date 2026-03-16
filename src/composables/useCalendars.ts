import { ref, readonly } from 'vue'
import { getCalDAVClient } from '../caldav/client'
import { discoverUserPrincipal, discoverCalendarHome } from '../caldav/discovery'
import type { Calendar } from '../types/calendar'

const calendars = ref<Calendar[]>([])
const loading = ref(false)
const error = ref<Error | null>(null)
const calendarHomeUrl = ref<string>('')

export function useCalendars() {
  const client = getCalDAVClient()

  async function loadCalendars(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Store calendar home URL for later use (calendar creation)
      const principal = await discoverUserPrincipal()
      const home = await discoverCalendarHome(principal)
      calendarHomeUrl.value = home

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

  async function deleteCalendarByHref(calendarHref: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await client.deleteCalendar(calendarHref)
      // Remove from local state
      calendars.value = calendars.value.filter((c) => c.href !== calendarHref)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to delete calendar')
      console.error('Failed to delete calendar:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    calendars: readonly(calendars),
    loading: readonly(loading),
    error: readonly(error),
    calendarHomeUrl: readonly(calendarHomeUrl),
    loadCalendars,
    toggleCalendarVisibility,
    setCalendarVisibility,
    getCalendarByHref,
    getDefaultCalendar,
    deleteCalendar: deleteCalendarByHref
  }
}
