export interface Calendar {
  href: string
  displayName: string
  color: string
  ctag: string
  description?: string
  visible: boolean
}

export interface CalendarEvent {
  uid: string
  calendarHref: string
  href: string
  etag: string
  summary: string
  start: Date
  end: Date
  allDay: boolean
  description?: string
  location?: string
  icsData: string
  rrule?: string
  recurrenceId?: string
  isRecurring: boolean
}

export interface RecurrenceFormData {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  endType: 'never' | 'count' | 'until'
  count?: number
  until?: Date
  byDay?: string[]
}

export interface EventFormData {
  uid?: string
  calendarHref: string
  summary: string
  start: Date
  end: Date
  allDay: boolean
  description: string
  location: string
  recurrence?: RecurrenceFormData
}

export interface DateRange {
  start: Date
  end: Date
}
