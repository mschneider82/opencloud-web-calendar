import { CalDAVError, AuthenticationError, NotFoundError, ConflictError } from './errors'
import { buildCalendarQuery } from './xml-builder'
import { parseEvents } from './xml-parser'
import { parseICS, generateICS, generateUID } from './ics-utils'
import { authenticatedFetch } from './auth'
import type { CalendarEvent, EventFormData, DateRange } from '../types/calendar'

async function report(url: string, body: string): Promise<string> {
  const response = await authenticatedFetch(url, {
    method: 'REPORT',
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '1'
    },
    body
  })

  if (response.status === 401) {
    throw new AuthenticationError()
  }
  if (response.status === 404) {
    throw new NotFoundError(`Calendar not found: ${url}`)
  }
  if (!response.ok && response.status !== 207) {
    throw new CalDAVError(`REPORT failed: ${response.statusText}`, response.status)
  }

  return response.text()
}

export async function fetchEvents(
  calendarHref: string,
  range: DateRange
): Promise<CalendarEvent[]> {
  const xml = await report(calendarHref, buildCalendarQuery(range.start, range.end))
  const eventData = parseEvents(xml)

  const events: CalendarEvent[] = []
  for (const data of eventData) {
    const event = parseICS(data.calendarData, data.href, data.etag)
    if (event) {
      events.push(event)
    }
  }

  return events
}

export async function createEvent(formData: EventFormData): Promise<CalendarEvent> {
  const uid = generateUID()
  const icsData = generateICS({ ...formData, uid })
  const eventHref = `${formData.calendarHref}${uid}.ics`

  const response = await authenticatedFetch(eventHref, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'If-None-Match': '*'
    },
    body: icsData
  })

  if (response.status === 401) {
    throw new AuthenticationError()
  }
  if (response.status === 412) {
    throw new ConflictError('Event already exists')
  }
  if (!response.ok && response.status !== 201) {
    throw new CalDAVError(`Failed to create event: ${response.statusText}`, response.status)
  }

  const etag = response.headers.get('ETag')?.replace(/"/g, '') || ''

  return {
    uid,
    calendarHref: formData.calendarHref,
    href: eventHref,
    etag,
    summary: formData.summary,
    start: formData.start,
    end: formData.end,
    allDay: formData.allDay,
    description: formData.description || undefined,
    location: formData.location || undefined,
    icsData
  }
}

export async function updateEvent(
  event: CalendarEvent,
  formData: EventFormData
): Promise<CalendarEvent> {
  const icsData = generateICS({ ...formData, uid: event.uid })

  const response = await authenticatedFetch(event.href, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'If-Match': `"${event.etag}"`
    },
    body: icsData
  })

  if (response.status === 401) {
    throw new AuthenticationError()
  }
  if (response.status === 404) {
    throw new NotFoundError('Event not found')
  }
  if (response.status === 412) {
    throw new ConflictError('Event was modified by another client', event.etag)
  }
  if (!response.ok && response.status !== 204) {
    throw new CalDAVError(`Failed to update event: ${response.statusText}`, response.status)
  }

  const etag = response.headers.get('ETag')?.replace(/"/g, '') || event.etag

  return {
    ...event,
    summary: formData.summary,
    start: formData.start,
    end: formData.end,
    allDay: formData.allDay,
    description: formData.description || undefined,
    location: formData.location || undefined,
    etag,
    icsData
  }
}

export async function deleteEvent(event: CalendarEvent): Promise<void> {
  const response = await authenticatedFetch(event.href, {
    method: 'DELETE',
    headers: {
      'If-Match': `"${event.etag}"`
    }
  })

  if (response.status === 401) {
    throw new AuthenticationError()
  }
  if (response.status === 404) {
    // Already deleted, consider success
    return
  }
  if (response.status === 412) {
    throw new ConflictError('Event was modified by another client')
  }
  if (!response.ok && response.status !== 204) {
    throw new CalDAVError(`Failed to delete event: ${response.statusText}`, response.status)
  }
}

export async function fetchSingleEvent(href: string): Promise<CalendarEvent | null> {
  const response = await authenticatedFetch(href, {
    method: 'GET',
    headers: {
      Accept: 'text/calendar'
    }
  })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new CalDAVError(`Failed to fetch event: ${response.statusText}`, response.status)
  }

  const icsData = await response.text()
  const etag = response.headers.get('ETag')?.replace(/"/g, '') || ''

  return parseICS(icsData, href, etag)
}
