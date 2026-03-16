export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function formatDateTimeForInput(date: Date): string {
  return `${formatDateForInput(date)}T${formatTimeForInput(date)}`
}

export function parseDateTimeInput(dateStr: string, timeStr?: string): Date {
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}`)
  }
  return new Date(`${dateStr}T00:00:00`)
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
  return { start, end }
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const start = new Date(date)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getExtendedRange(date: Date): { start: Date; end: Date } {
  // Get a range that covers the current month plus padding for calendar views
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 2, 0, 23, 59, 59)
  return { start, end }
}
