import ICAL from 'ical.js'
import type {
  CalendarEvent,
  EventFormData,
  DateRange,
  RecurrenceFormData
} from '../types/calendar'

/**
 * Parse an ICS string and return one or more CalendarEvent objects.
 * For recurring events, occurrences within the given range are expanded.
 * For non-recurring events, a single-element array is returned.
 */
export function parseICS(
  icsData: string,
  href: string,
  etag: string,
  range?: DateRange
): CalendarEvent[] {
  try {
    const jcalData = ICAL.parse(icsData)
    const comp = new ICAL.Component(jcalData)
    const vevents = comp.getAllSubcomponents('vevent')

    if (vevents.length === 0) return []

    // Extract calendar href from event href
    const calendarHref = href.substring(0, href.lastIndexOf('/') + 1)

    // Separate master event from exception overrides
    let masterVevent: ICAL.Component | null = null
    const exceptions: ICAL.Component[] = []

    for (const vevent of vevents) {
      if (vevent.getFirstPropertyValue('recurrence-id')) {
        exceptions.push(vevent)
      } else {
        masterVevent = vevent
      }
    }

    // If no master found, just use the first vevent
    if (!masterVevent) {
      masterVevent = vevents[0]
    }

    const masterEvent = new ICAL.Event(masterVevent)
    const rruleProp = masterVevent.getFirstPropertyValue('rrule')
    const isRecurring = masterEvent.isRecurring()

    if (!isRecurring) {
      // Simple non-recurring event
      const parsed = parseVevent(masterVevent, href, etag, calendarHref, icsData)
      return parsed ? [parsed] : []
    }

    // Build a map of exception overrides keyed by RECURRENCE-ID
    const exceptionMap = new Map<string, ICAL.Component>()
    for (const exc of exceptions) {
      const recId = exc.getFirstPropertyValue('recurrence-id') as ICAL.Time
      if (recId) {
        exceptionMap.set(recId.toString(), exc)
      }
    }

    // Also collect EXDATE values to skip
    const exdates = new Set<string>()
    const exdateProps = masterVevent.getAllProperties('exdate')
    for (const prop of exdateProps) {
      const values = prop.getValues() as ICAL.Time[]
      for (const val of values) {
        exdates.add(val.toString())
      }
    }

    const rruleStr = rruleProp ? rruleProp.toString() : undefined
    const results: CalendarEvent[] = []
    const dtstart = masterVevent.getFirstPropertyValue('dtstart') as ICAL.Time
    if (!dtstart) return []

    const duration = masterEvent.duration

    // Set expansion bounds
    const rangeStart = range
      ? ICAL.Time.fromJSDate(range.start, false)
      : ICAL.Time.fromJSDate(new Date(Date.now() - 365 * 86400000), false)
    const rangeEnd = range
      ? ICAL.Time.fromJSDate(range.end, false)
      : ICAL.Time.fromJSDate(new Date(Date.now() + 365 * 86400000), false)

    // Use ical.js expansion
    const iter = masterEvent.iterator(dtstart)
    let next: ICAL.Time | null
    const MAX_OCCURRENCES = 500 // safety limit

    for (let i = 0; i < MAX_OCCURRENCES; i++) {
      next = iter.next()
      if (!next) break

      // Past the range end, stop
      if (next.compare(rangeEnd) > 0) break

      // Calculate occurrence end
      const occEnd = next.clone()
      occEnd.addDuration(duration)

      // Before range start, skip
      if (occEnd.compare(rangeStart) < 0) continue

      // Check if this occurrence is excluded
      const nextStr = next.toString()
      if (exdates.has(nextStr)) continue

      // Check if there's an exception override
      const exceptionVevent = exceptionMap.get(nextStr)
      if (exceptionVevent) {
        const excEvent = parseVevent(exceptionVevent, href, etag, calendarHref, icsData)
        if (excEvent) {
          const recId = exceptionVevent.getFirstPropertyValue('recurrence-id') as ICAL.Time
          results.push({
            ...excEvent,
            isRecurring: true,
            rrule: rruleStr,
            recurrenceId: recId.toString()
          })
        }
        continue
      }

      // Regular occurrence
      const allDay = next.isDate
      const start = next.toJSDate()
      const end = occEnd.toJSDate()

      results.push({
        uid: masterEvent.uid,
        calendarHref,
        href,
        etag,
        summary: masterEvent.summary || '',
        start,
        end,
        allDay,
        description: masterEvent.description || undefined,
        location: masterEvent.location || undefined,
        icsData,
        isRecurring: true,
        rrule: rruleStr,
        recurrenceId: nextStr
      })
    }

    return results
  } catch (e) {
    console.error('Failed to parse ICS:', e)
    return []
  }
}

function parseVevent(
  vevent: ICAL.Component,
  href: string,
  etag: string,
  calendarHref: string,
  icsData: string
): CalendarEvent | null {
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
    end = new Date(start)
    if (allDay) {
      end.setDate(end.getDate() + 1)
    }
  }

  const rruleProp = vevent.getFirstPropertyValue('rrule')
  const recIdProp = vevent.getFirstPropertyValue('recurrence-id') as ICAL.Time | null

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
    icsData,
    isRecurring: !!rruleProp || !!recIdProp,
    rrule: rruleProp ? rruleProp.toString() : undefined,
    recurrenceId: recIdProp ? recIdProp.toString() : undefined
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

  if (formData.recurrence) {
    lines.push(`RRULE:${buildRRuleString(formData.recurrence, formData.allDay)}`)
  }

  if (formData.description) {
    lines.push(`DESCRIPTION:${escapeICALText(formData.description)}`)
  }

  if (formData.location) {
    lines.push(`LOCATION:${escapeICALText(formData.location)}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}

function buildRRuleString(rec: RecurrenceFormData, allDay: boolean): string {
  const parts: string[] = [`FREQ=${rec.frequency}`]

  if (rec.interval > 1) {
    parts.push(`INTERVAL=${rec.interval}`)
  }

  if (rec.frequency === 'WEEKLY' && rec.byDay && rec.byDay.length > 0) {
    parts.push(`BYDAY=${rec.byDay.join(',')}`)
  }

  if (rec.endType === 'count' && rec.count) {
    parts.push(`COUNT=${rec.count}`)
  } else if (rec.endType === 'until' && rec.until) {
    if (allDay) {
      parts.push(`UNTIL=${formatICALDate(rec.until)}`)
    } else {
      parts.push(`UNTIL=${formatICALDateTime(rec.until)}`)
    }
  }

  return parts.join(';')
}

/**
 * Parse an RRULE string into RecurrenceFormData for the edit form.
 */
export function parseRRuleToFormData(rruleStr: string): RecurrenceFormData {
  const recur = ICAL.Recur.fromString(rruleStr)

  const frequency = recur.freq as RecurrenceFormData['frequency']
  const interval = recur.interval || 1

  let endType: RecurrenceFormData['endType'] = 'never'
  let count: number | undefined
  let until: Date | undefined

  if (recur.count) {
    endType = 'count'
    count = recur.count
  } else if (recur.until) {
    endType = 'until'
    until = recur.until.toJSDate()
  }

  let byDay: string[] | undefined
  if (recur.parts && recur.parts.BYDAY) {
    byDay = recur.parts.BYDAY as string[]
  }

  return { frequency, interval, endType, count, until, byDay }
}

/**
 * Update an existing ICS resource to add an EXDATE (exclude one occurrence)
 * and optionally add an exception VEVENT with RECURRENCE-ID.
 */
export function addExceptionToICS(
  icsData: string,
  recurrenceId: string,
  exceptionFormData?: EventFormData
): string {
  const jcalData = ICAL.parse(icsData)
  const comp = new ICAL.Component(jcalData)
  const vevents = comp.getAllSubcomponents('vevent')

  // Find master event (one without RECURRENCE-ID)
  let masterVevent: ICAL.Component | null = null
  for (const vevent of vevents) {
    if (!vevent.getFirstPropertyValue('recurrence-id')) {
      masterVevent = vevent
      break
    }
  }

  if (!masterVevent) return icsData

  // Parse the recurrence-id into an ICAL.Time
  const masterDtstart = masterVevent.getFirstPropertyValue('dtstart') as ICAL.Time
  const isDate = masterDtstart?.isDate || false
  const recIdTime = isDate
    ? ICAL.Time.fromDateString(recurrenceId)
    : ICAL.Time.fromDateTimeString(recurrenceId)

  if (exceptionFormData) {
    // Adding a modified occurrence: add EXDATE + new VEVENT with RECURRENCE-ID
    // First, remove any existing exception for this recurrence-id
    const existingExceptions = comp.getAllSubcomponents('vevent')
    for (const exc of existingExceptions) {
      const excRecId = exc.getFirstPropertyValue('recurrence-id') as ICAL.Time | null
      if (excRecId && excRecId.toString() === recurrenceId) {
        comp.removeSubcomponent(exc)
      }
    }

    // Build exception VEVENT
    const excVevent = new ICAL.Component('vevent')
    const masterEvent = new ICAL.Event(masterVevent)

    excVevent.addPropertyWithValue('uid', masterEvent.uid)
    excVevent.addPropertyWithValue(
      'dtstamp',
      ICAL.Time.fromJSDate(new Date(), false)
    )

    // Set RECURRENCE-ID
    const recIdProp = excVevent.addPropertyWithValue('recurrence-id', recIdTime)
    if (isDate) {
      recIdProp.setParameter('value', 'DATE')
    }

    // Set start/end
    if (exceptionFormData.allDay) {
      const startProp = excVevent.addPropertyWithValue(
        'dtstart',
        ICAL.Time.fromJSDate(exceptionFormData.start, false)
      )
      startProp.setParameter('value', 'DATE')
      ;(startProp.getFirstValue() as ICAL.Time).isDate = true
      const endProp = excVevent.addPropertyWithValue(
        'dtend',
        ICAL.Time.fromJSDate(exceptionFormData.end, false)
      )
      endProp.setParameter('value', 'DATE')
      ;(endProp.getFirstValue() as ICAL.Time).isDate = true
    } else {
      excVevent.addPropertyWithValue(
        'dtstart',
        ICAL.Time.fromJSDate(exceptionFormData.start, false)
      )
      excVevent.addPropertyWithValue(
        'dtend',
        ICAL.Time.fromJSDate(exceptionFormData.end, false)
      )
    }

    excVevent.addPropertyWithValue('summary', exceptionFormData.summary)
    if (exceptionFormData.description) {
      excVevent.addPropertyWithValue('description', exceptionFormData.description)
    }
    if (exceptionFormData.location) {
      excVevent.addPropertyWithValue('location', exceptionFormData.location)
    }

    comp.addSubcomponent(excVevent)
  } else {
    // Deleting a single occurrence: just add EXDATE to master
    const exdateProp = masterVevent.addPropertyWithValue('exdate', recIdTime)
    if (isDate) {
      exdateProp.setParameter('value', 'DATE')
    }
  }

  return comp.toString()
}

/**
 * Update an existing ICS resource to modify the master (series) event properties.
 */
export function updateSeriesICS(icsData: string, formData: EventFormData): string {
  const jcalData = ICAL.parse(icsData)
  const comp = new ICAL.Component(jcalData)
  const vevents = comp.getAllSubcomponents('vevent')

  // Find master event
  let masterVevent: ICAL.Component | null = null
  for (const vevent of vevents) {
    if (!vevent.getFirstPropertyValue('recurrence-id')) {
      masterVevent = vevent
      break
    }
  }

  if (!masterVevent) return icsData

  // Update summary
  masterVevent.updatePropertyWithValue('summary', formData.summary)

  // Update description
  if (formData.description) {
    masterVevent.updatePropertyWithValue('description', formData.description)
  } else {
    masterVevent.removeAllProperties('description')
  }

  // Update location
  if (formData.location) {
    masterVevent.updatePropertyWithValue('location', formData.location)
  } else {
    masterVevent.removeAllProperties('location')
  }

  // Update start/end
  if (formData.allDay) {
    const startTime = ICAL.Time.fromJSDate(formData.start, false)
    startTime.isDate = true
    const endTime = ICAL.Time.fromJSDate(formData.end, false)
    endTime.isDate = true
    masterVevent.updatePropertyWithValue('dtstart', startTime)
    masterVevent.updatePropertyWithValue('dtend', endTime)
  } else {
    masterVevent.updatePropertyWithValue(
      'dtstart',
      ICAL.Time.fromJSDate(formData.start, false)
    )
    masterVevent.updatePropertyWithValue(
      'dtend',
      ICAL.Time.fromJSDate(formData.end, false)
    )
  }

  // Update RRULE
  masterVevent.removeAllProperties('rrule')
  if (formData.recurrence) {
    const rruleStr = buildRRuleString(formData.recurrence, formData.allDay)
    masterVevent.addPropertyWithValue('rrule', ICAL.Recur.fromString(rruleStr))
  }

  // Update DTSTAMP
  masterVevent.updatePropertyWithValue(
    'dtstamp',
    ICAL.Time.fromJSDate(new Date(), false)
  )

  return comp.toString()
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
