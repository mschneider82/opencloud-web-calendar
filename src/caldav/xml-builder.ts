const DAV_NS = 'DAV:'
const CALDAV_NS = 'urn:ietf:params:xml:ns:caldav'
const CALSERVER_NS = 'http://calendarserver.org/ns/'
const ICAL_NS = 'http://apple.com/ns/ical/'

export function buildPropfindCurrentUserPrincipal(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="${DAV_NS}">
  <d:prop>
    <d:current-user-principal/>
  </d:prop>
</d:propfind>`
}

export function buildPropfindCalendarHome(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="${DAV_NS}" xmlns:c="${CALDAV_NS}">
  <d:prop>
    <c:calendar-home-set/>
  </d:prop>
</d:propfind>`
}

export function buildPropfindCalendars(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="${DAV_NS}" xmlns:c="${CALDAV_NS}" xmlns:cs="${CALSERVER_NS}" xmlns:ic="${ICAL_NS}">
  <d:prop>
    <d:resourcetype/>
    <d:displayname/>
    <c:calendar-description/>
    <ic:calendar-color/>
    <cs:getctag/>
  </d:prop>
</d:propfind>`
}

export function buildCalendarQuery(start: Date, end: Date): string {
  const startStr = formatDateTimeUTC(start)
  const endStr = formatDateTimeUTC(end)

  return `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="${DAV_NS}" xmlns:c="${CALDAV_NS}">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${startStr}" end="${endStr}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`
}

export function buildMkCalendar(displayName: string, description?: string, color?: string): string {
  const descriptionProp = description
    ? `    <c:calendar-description>${escapeXml(description)}</c:calendar-description>\n`
    : ''

  const colorProp = color ? `    <ic:calendar-color>${escapeXml(color)}</ic:calendar-color>\n` : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<d:mkcalendar xmlns:d="${DAV_NS}" xmlns:c="${CALDAV_NS}" xmlns:ic="${ICAL_NS}">
  <d:set>
    <d:prop>
      <d:displayname>${escapeXml(displayName)}</d:displayname>
${descriptionProp}${colorProp}    </d:prop>
  </d:set>
</d:mkcalendar>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDateTimeUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
