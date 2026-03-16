import { CalDAVError, AuthenticationError, NotFoundError } from './errors'
import {
  buildPropfindCurrentUserPrincipal,
  buildPropfindCalendarHome,
  buildPropfindCalendars
} from './xml-builder'
import { parseCurrentUserPrincipal, parseCalendarHomeSet, parseCalendars } from './xml-parser'
import { authenticatedFetch } from './auth'
import type { Calendar } from '../types/calendar'

const CALDAV_BASE = '/caldav/'

async function propfind(url: string, body: string, depth: '0' | '1' = '0'): Promise<string> {
  const response = await authenticatedFetch(url, {
    method: 'PROPFIND',
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: depth
    },
    body
  })

  if (response.status === 401) {
    throw new AuthenticationError()
  }
  if (response.status === 404) {
    throw new NotFoundError(`Resource not found: ${url}`)
  }
  if (!response.ok && response.status !== 207) {
    throw new CalDAVError(`PROPFIND failed: ${response.statusText}`, response.status)
  }

  return response.text()
}

export async function discoverUserPrincipal(): Promise<string> {
  const xml = await propfind(CALDAV_BASE, buildPropfindCurrentUserPrincipal())
  const principal = parseCurrentUserPrincipal(xml)
  if (!principal) {
    throw new CalDAVError('Could not discover user principal')
  }
  return principal
}

export async function discoverCalendarHome(principalUrl: string): Promise<string> {
  const xml = await propfind(principalUrl, buildPropfindCalendarHome())
  const home = parseCalendarHomeSet(xml)
  if (!home) {
    throw new CalDAVError('Could not discover calendar home')
  }
  return home
}

export async function listCalendars(calendarHomeUrl: string): Promise<Calendar[]> {
  const xml = await propfind(calendarHomeUrl, buildPropfindCalendars(), '1')
  const calendarData = parseCalendars(xml)

  return calendarData.map((data) => ({
    href: data.href || '',
    displayName: data.displayName || 'Calendar',
    color: normalizeColor(data.color) || '#3788d8',
    ctag: data.ctag || '',
    description: data.description,
    visible: true
  }))
}

export async function discoverCalendars(): Promise<Calendar[]> {
  const principal = await discoverUserPrincipal()
  const home = await discoverCalendarHome(principal)
  return listCalendars(home)
}

function normalizeColor(color: string | undefined): string | undefined {
  if (!color) return undefined
  // Handle Apple-style colors like "#FF0000FF" (with alpha)
  if (color.length === 9 && color.startsWith('#')) {
    return color.slice(0, 7)
  }
  return color
}
