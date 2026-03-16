export interface PropfindResponse {
  href: string
  status: number
  props: Record<string, unknown>
}

export interface CalendarData {
  href: string
  displayName?: string
  color?: string
  ctag?: string
  description?: string
  resourceType?: string[]
}

export interface EventData {
  href: string
  etag: string
  calendarData: string
}

export interface MultistatusResponse {
  responses: PropfindResponse[]
}
