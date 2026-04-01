import { ref, computed, readonly } from 'vue'
import { getCalDAVClient } from '../caldav/client'
import type { Calendar, CalendarEvent, DateRange } from '../types/calendar'

const events = ref<CalendarEvent[]>([])
const loading = ref(false)
const error = ref<Error | null>(null)
const currentRange = ref<DateRange | null>(null)

export function useEvents() {
  const client = getCalDAVClient()

  async function fetchEvents(calendars: Calendar[], range: DateRange): Promise<void> {
    loading.value = true
    error.value = null
    currentRange.value = range

    try {
      events.value = await client.fetchAllEvents(calendars, range)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch events')
      console.error('Failed to fetch events:', err)
    } finally {
      loading.value = false
    }
  }

  async function refreshEvents(calendars: Calendar[]): Promise<void> {
    if (currentRange.value) {
      await fetchEvents(calendars, currentRange.value)
    }
  }

  function getVisibleEvents(calendars: Calendar[]): CalendarEvent[] {
    const visibleHrefs = new Set(calendars.filter((c) => c.visible).map((c) => c.href))
    return events.value.filter((e) => visibleHrefs.has(e.calendarHref))
  }

  function addEvent(event: CalendarEvent): void {
    events.value = [...events.value, event]
  }

  function updateEventInCache(updatedEvent: CalendarEvent): void {
    if (updatedEvent.recurrenceId) {
      // Update a specific occurrence
      events.value = events.value.map((e) =>
        e.uid === updatedEvent.uid && e.recurrenceId === updatedEvent.recurrenceId
          ? updatedEvent
          : e
      )
    } else {
      events.value = events.value.map((e) => (e.uid === updatedEvent.uid ? updatedEvent : e))
    }
  }

  function removeEvent(uid: string, recurrenceId?: string): void {
    if (recurrenceId) {
      // Remove a specific occurrence
      events.value = events.value.filter(
        (e) => !(e.uid === uid && e.recurrenceId === recurrenceId)
      )
    } else {
      // Remove all instances of this UID
      events.value = events.value.filter((e) => e.uid !== uid)
    }
  }

  function findEventByUid(uid: string): CalendarEvent | undefined {
    return events.value.find((e) => e.uid === uid)
  }

  const visibleEventsComputed = computed(() => events.value)

  return {
    events: readonly(events),
    loading: readonly(loading),
    error: readonly(error),
    currentRange: readonly(currentRange),
    visibleEvents: visibleEventsComputed,
    fetchEvents,
    refreshEvents,
    getVisibleEvents,
    addEvent,
    updateEventInCache,
    removeEvent,
    findEventByUid
  }
}
