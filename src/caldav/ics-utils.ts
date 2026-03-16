import ICAL from 'ical.js'
import type { CalendarEvent, EventFormData } from '../types/calendar'

export function parseICS(icsData: string, href: string, etag: string): CalendarEvent | null {
  try {
    const jcalData = ICAL.parse(icsData)
    const comp = new ICAL.Component(jcalData)
    const vevent = comp.getFirstSubcomponent('vevent')

    if (!vevent) return null

    const event = new ICAL.Event(vevent)
    const dtstart = vevent.getFirstPropertyValue('dtstart') as ICAL.Time | null
    const dtend = vevent.getFirstPropertyValue('dtend') as ICAL.Time | null

    if (!dtstart) return null

    const allDay = dtstart.isDate
    const start = dtstart.toJSDate()
    let end: Date

    if (dtend) {
      end = dtend.toJSDate()
    } else {
      // If no end time, assume same as start (or next day for all-day)
      end = new Date(start)
      if (allDay) {
        end.setDate(end.getDate() + 1)
      }
    }

    // Extract calendar href from event href
    const calendarHref = href.substring(0, href.lastIndexOf('/') + 1)

    return {
      uid: event.uid,
      calendarHref,
      href,
      etag,
      summary: event.summary || '',
      start,
      end,
      allDay,
      description: event.description || undefined,
      location: event.location || undefined,
      icsData
    }
  } catch {
    console.error('Failed to parse ICS:', icsData)
    return null
  }
}

export function generateICS(formData: EventFormData): string {
  const uid = formData.uid || generateUID()
  const now = new Date()
  const dtstamp = formatICALDateTime(now)

  let dtstart: string
  let dtend: string

  if (formData.allDay) {
    dtstart = `DTSTART;VALUE=DATE:${formatICALDate(formData.start)}`
    dtend = `DTEND;VALUE=DATE:${formatICALDate(formData.end)}`
  } else {
    dtstart = `DTSTART:${formatICALDateTime(formData.start)}`
    dtend = `DTEND:${formatICALDateTime(formData.end)}`
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenCloud//Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    dtstart,
    dtend,
    `SUMMARY:${escapeICALText(formData.summary)}`
  ]

  if (formData.description) {
    lines.push(`DESCRIPTION:${escapeICALText(formData.description)}`)
  }

  if (formData.location) {
    lines.push(`LOCATION:${escapeICALText(formData.location)}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}

export function generateUID(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}@opencloud`
}

function formatICALDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function formatICALDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function escapeICALText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
