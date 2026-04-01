import { discoverCalendars, listCalendars } from './discovery'
import {
  fetchEvents as fetchEventsFromCalendar,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchSingleEvent,
  updateEventOccurrence,
  deleteEventOccurrence,
  updateEventSeries
} from './events'
import {
  createCalendar as createCalendarRequest,
  deleteCalendar as deleteCalendarRequest,
  type CreateCalendarData
} from './calendar-management'
import type { Calendar, CalendarEvent, EventFormData, DateRange } from '../types/calendar'

export { CalDAVError, AuthenticationError, NotFoundError, ConflictError, NetworkError } from './errors'
export type { CreateCalendarData } from './calendar-management'

export interface CalDAVClient {
  discoverCalendars(): Promise<Calendar[]>
  refreshCalendars(calendarHomeUrl: string): Promise<Calendar[]>
  fetchEvents(calendarHref: string, range: DateRange): Promise<CalendarEvent[]>
  fetchAllEvents(calendars: Calendar[], range: DateRange): Promise<CalendarEvent[]>
  createEvent(formData: EventFormData): Promise<CalendarEvent>
  updateEvent(event: CalendarEvent, formData: EventFormData): Promise<CalendarEvent>
  deleteEvent(event: CalendarEvent): Promise<void>
  fetchSingleEvent(href: string): Promise<CalendarEvent | null>
  updateEventOccurrence(event: CalendarEvent, recurrenceId: string, formData: EventFormData): Promise<void>
  deleteEventOccurrence(event: CalendarEvent, recurrenceId: string): Promise<void>
  updateEventSeries(event: CalendarEvent, formData: EventFormData): Promise<void>
  createCalendar(calendarHomeUrl: string, data: CreateCalendarData): Promise<Calendar>
  deleteCalendar(calendarHref: string): Promise<void>
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
    fetchSingleEvent,
    updateEventOccurrence,
    deleteEventOccurrence,
    updateEventSeries,
    createCalendar: createCalendarRequest,
    deleteCalendar: deleteCalendarRequest
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
