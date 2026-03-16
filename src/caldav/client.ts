import { discoverCalendars, listCalendars } from './discovery'
import {
  fetchEvents as fetchEventsFromCalendar,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchSingleEvent
} from './events'
import type { Calendar, CalendarEvent, EventFormData, DateRange } from '../types/calendar'

export { CalDAVError, AuthenticationError, NotFoundError, ConflictError, NetworkError } from './errors'

export interface CalDAVClient {
  discoverCalendars(): Promise<Calendar[]>
  refreshCalendars(calendarHomeUrl: string): Promise<Calendar[]>
  fetchEvents(calendarHref: string, range: DateRange): Promise<CalendarEvent[]>
  fetchAllEvents(calendars: Calendar[], range: DateRange): Promise<CalendarEvent[]>
  createEvent(formData: EventFormData): Promise<CalendarEvent>
  updateEvent(event: CalendarEvent, formData: EventFormData): Promise<CalendarEvent>
  deleteEvent(event: CalendarEvent): Promise<void>
  fetchSingleEvent(href: string): Promise<CalendarEvent | null>
}

export function createCalDAVClient(): CalDAVClient {
  return {
    discoverCalendars,

    refreshCalendars: listCalendars,

    fetchEvents: fetchEventsFromCalendar,

    async fetchAllEvents(calendars: Calendar[], range: DateRange): Promise<CalendarEvent[]> {
      const visibleCalendars = calendars.filter((c) => c.visible)
      const results = await Promise.all(
        visibleCalendars.map((cal) => fetchEventsFromCalendar(cal.href, range))
      )
      return results.flat()
    },

    createEvent,
    updateEvent,
    deleteEvent,
    fetchSingleEvent
  }
}

// Singleton instance
let clientInstance: CalDAVClient | null = null

export function getCalDAVClient(): CalDAVClient {
  if (!clientInstance) {
    clientInstance = createCalDAVClient()
  }
  return clientInstance
}
