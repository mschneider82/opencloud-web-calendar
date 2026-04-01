import ICAL from 'ical.js'
import { authenticatedFetch } from './auth'
import { CalDAVError, AuthenticationError } from './errors'
import { parseEvents } from './xml-parser'

// --- Types ---

export interface ImportEventGroup {
  uid: string
  rawICS: string
  summary: string
  isRecurring: boolean
  exceptionCount: number
  sequence: number
  lastModified: string | null
}

export type ImportAction =
  | { type: 'create'; group: ImportEventGroup }
  | { type: 'update'; group: ImportEventGroup; existingHref: string }
  | { type: 'skip'; group: ImportEventGroup; reason: string }

export type ImportResult =
  | { type: 'created'; uid: string; summary: string }
  | { type: 'updated'; uid: string; summary: string }
  | { type: 'skipped'; uid: string; summary: string; reason: string }
  | { type: 'failed'; uid: string; summary: string; error: string }

export interface ImportReport {
  mode: 'new-calendar' | 'merge'
  calendarName: string
  totalParsed: number
  created: number
  updated: number
  skipped: number
  failed: number
  results: ImportResult[]
  errors: string[]
}

export interface ExistingEventMeta {
  href: string
  etag: string
  uid: string
  sequence: number
  lastModified: string | null
}

// --- Stage 1: File Reading ---

export function readICSFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      if (!text.trim().startsWith('BEGIN:VCALENDAR')) {
        reject(new Error('Invalid ICS file: does not start with BEGIN:VCALENDAR'))
        return
      }
      resolve(text)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file, 'utf-8')
  })
}

// --- Stage 2+3: ICS Parsing, Validation, Grouping ---

export function parseICSFile(icsText: string): {
  groups: ImportEventGroup[]
  errors: string[]
} {
  const errors: string[] = []

  let jcalData: any
  try {
    jcalData = ICAL.parse(icsText)
  } catch (e) {
    return { groups: [], errors: [`Failed to parse ICS: ${e}`] }
  }

  const comp = new ICAL.Component(jcalData)
  const vevents = comp.getAllSubcomponents('vevent')

  if (vevents.length === 0) {
    return { groups: [], errors: ['No VEVENT components found in file'] }
  }

  // Collect all VTIMEZONEs from the source for reconstruction
  const vtimezones = comp.getAllSubcomponents('vtimezone')

  // Group VEVENTs by UID
  const uidGroups = new Map<string, ICAL.Component[]>()

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent)
    let uid = event.uid

    // Validate: must have DTSTART
    const dtstart = vevent.getFirstPropertyValue('dtstart')
    if (!dtstart) {
      const summary = event.summary || '(no title)'
      errors.push(`Skipped event "${summary}": missing DTSTART`)
      continue
    }

    // Generate UID if missing
    if (!uid) {
      uid = generateStableUID(vevent)
      vevent.updatePropertyWithValue('uid', uid)
    }

    const normalizedUid = uid.trim()
    if (!uidGroups.has(normalizedUid)) {
      uidGroups.set(normalizedUid, [])
    }
    uidGroups.get(normalizedUid)!.push(vevent)
  }

  // Build ImportEventGroup for each UID
  const groups: ImportEventGroup[] = []

  for (const [uid, eventComponents] of uidGroups) {
    // Separate master from exceptions
    let master: ICAL.Component | null = null
    const exceptions: ICAL.Component[] = []

    for (const vevent of eventComponents) {
      if (vevent.getFirstPropertyValue('recurrence-id')) {
        exceptions.push(vevent)
      } else {
        master = vevent
      }
    }

    // If no master found, use first component
    if (!master) {
      master = eventComponents[0]
    }

    const masterEvent = new ICAL.Event(master)
    const rrule = master.getFirstPropertyValue('rrule')
    const sequenceProp = master.getFirstPropertyValue('sequence')
    const lastModProp = master.getFirstPropertyValue('last-modified')

    // Reconstruct a standalone VCALENDAR for this UID
    const newCal = new ICAL.Component('vcalendar')
    newCal.addPropertyWithValue('version', '2.0')
    newCal.addPropertyWithValue('prodid', '-//OpenCloud//Calendar Import//EN')

    // Add relevant VTIMEZONEs
    const referencedTzids = collectReferencedTimezones(eventComponents)
    for (const vtz of vtimezones) {
      const tzid = vtz.getFirstPropertyValue('tzid') as string | null
      if (tzid && referencedTzids.has(tzid)) {
        newCal.addSubcomponent(vtz)
      }
    }

    // Add master VEVENT
    newCal.addSubcomponent(master)

    // Add exception VEVENTs
    for (const exc of exceptions) {
      newCal.addSubcomponent(exc)
    }

    groups.push({
      uid,
      rawICS: newCal.toString(),
      summary: masterEvent.summary || '(no title)',
      isRecurring: !!rrule,
      exceptionCount: exceptions.length,
      sequence: typeof sequenceProp === 'number' ? sequenceProp : 0,
      lastModified: lastModProp ? lastModProp.toString() : null
    })
  }

  return { groups, errors }
}

function collectReferencedTimezones(vevents: ICAL.Component[]): Set<string> {
  const tzids = new Set<string>()
  for (const vevent of vevents) {
    for (const prop of vevent.getAllProperties()) {
      const tzid = prop.getParameter('tzid') as string | null
      if (tzid) {
        tzids.add(tzid)
      }
    }
  }
  return tzids
}

function generateStableUID(vevent: ICAL.Component): string {
  // Create a deterministic UID from event content
  const summary = vevent.getFirstPropertyValue('summary') || ''
  const dtstart = vevent.getFirstPropertyValue('dtstart')
  const startStr = dtstart ? dtstart.toString() : ''
  const raw = `${summary}-${startStr}-${Date.now()}`

  // Simple hash
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return `import-${Math.abs(hash).toString(36)}@opencloud`
}

// --- Stage 6: Fetch Existing Events for Merge ---

export async function fetchExistingEventMeta(
  calendarHref: string
): Promise<Map<string, ExistingEventMeta>> {
  // REPORT without time-range filter to get ALL events
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT"/>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`

  const response = await authenticatedFetch(calendarHref, {
    method: 'REPORT',
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '1'
    },
    body
  })

  if (response.status === 401) throw new AuthenticationError()
  if (!response.ok && response.status !== 207) {
    throw new CalDAVError(`REPORT failed: ${response.statusText}`, response.status)
  }

  const xml = await response.text()
  const eventData = parseEvents(xml)
  const result = new Map<string, ExistingEventMeta>()

  for (const data of eventData) {
    try {
      const jcalData = ICAL.parse(data.calendarData)
      const comp = new ICAL.Component(jcalData)
      const vevent = comp.getFirstSubcomponent('vevent')
      if (!vevent) continue

      const event = new ICAL.Event(vevent)
      const uid = event.uid?.trim()
      if (!uid) continue

      const sequenceProp = vevent.getFirstPropertyValue('sequence')
      const lastModProp = vevent.getFirstPropertyValue('last-modified')

      result.set(uid, {
        href: data.href,
        etag: data.etag,
        uid,
        sequence: typeof sequenceProp === 'number' ? sequenceProp : 0,
        lastModified: lastModProp ? lastModProp.toString() : null
      })
    } catch {
      // Skip unparseable events
    }
  }

  return result
}

// --- Stage 7: Write Plan ---

export function generateImportPlan(
  groups: ImportEventGroup[],
  existing: Map<string, ExistingEventMeta> | null,
  mode: 'new-calendar' | 'merge'
): ImportAction[] {
  if (mode === 'new-calendar' || !existing) {
    return groups.map((group) => ({ type: 'create' as const, group }))
  }

  return groups.map((group) => {
    const normalizedUid = group.uid.trim()
    const existingMeta = existing.get(normalizedUid)

    if (!existingMeta) {
      return { type: 'create' as const, group }
    }

    // Compare versions: imported wins if newer or equal
    if (group.sequence > existingMeta.sequence) {
      return {
        type: 'update' as const,
        group,
        existingHref: existingMeta.href
      }
    }

    if (group.sequence < existingMeta.sequence) {
      return {
        type: 'skip' as const,
        group,
        reason: 'Existing event has newer version (higher SEQUENCE)'
      }
    }

    // Same sequence — compare LAST-MODIFIED
    if (group.lastModified && existingMeta.lastModified) {
      if (group.lastModified < existingMeta.lastModified) {
        return {
          type: 'skip' as const,
          group,
          reason: 'Existing event has newer LAST-MODIFIED'
        }
      }
    }

    // Same sequence, same or missing LAST-MODIFIED — imported wins on tie
    return {
      type: 'update' as const,
      group,
      existingHref: existingMeta.href
    }
  })
}

// --- Stage 8: Execution ---

export async function executeImportPlan(
  actions: ImportAction[],
  calendarHref: string,
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  const total = actions.length

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    onProgress?.(i + 1, total)

    if (action.type === 'skip') {
      results.push({
        type: 'skipped',
        uid: action.group.uid,
        summary: action.group.summary,
        reason: action.reason
      })
      continue
    }

    try {
      if (action.type === 'create') {
        await putRawICS(
          `${calendarHref}${encodeURIComponent(action.group.uid)}.ics`,
          action.group.rawICS,
          true
        )
        results.push({
          type: 'created',
          uid: action.group.uid,
          summary: action.group.summary
        })
      } else if (action.type === 'update') {
        await putRawICS(action.existingHref, action.group.rawICS, false)
        results.push({
          type: 'updated',
          uid: action.group.uid,
          summary: action.group.summary
        })
      }
    } catch (e) {
      results.push({
        type: 'failed',
        uid: action.group.uid,
        summary: action.group.summary,
        error: e instanceof Error ? e.message : String(e)
      })
    }
  }

  return results
}

async function putRawICS(
  href: string,
  icsData: string,
  isNew: boolean
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'text/calendar; charset=utf-8'
  }

  if (isNew) {
    headers['If-None-Match'] = '*'
  }

  const response = await authenticatedFetch(href, {
    method: 'PUT',
    headers,
    body: icsData
  })

  if (response.status === 401) throw new AuthenticationError()
  if (!response.ok && response.status !== 201 && response.status !== 204) {
    throw new CalDAVError(
      `PUT failed (${response.status}): ${response.statusText}`,
      response.status
    )
  }

  return response.headers.get('ETag')?.replace(/"/g, '') || ''
}

// --- Stage 9: Report ---

export function buildImportReport(
  mode: 'new-calendar' | 'merge',
  calendarName: string,
  totalParsed: number,
  results: ImportResult[],
  parseErrors: string[]
): ImportReport {
  return {
    mode,
    calendarName,
    totalParsed,
    created: results.filter((r) => r.type === 'created').length,
    updated: results.filter((r) => r.type === 'updated').length,
    skipped: results.filter((r) => r.type === 'skipped').length,
    failed: results.filter((r) => r.type === 'failed').length,
    results,
    errors: parseErrors
  }
}
