import { ref, readonly, computed } from 'vue'
import { getCalDAVClient, ConflictError } from '../caldav/client'
import type { CalendarEvent, EventFormData } from '../types/calendar'

const isOpen = ref(false)
const editingEvent = ref<CalendarEvent | null>(null)
const formData = ref<EventFormData>(createEmptyFormData(''))
const saving = ref(false)
const error = ref<Error | null>(null)
const conflictData = ref<{ serverEvent: CalendarEvent; localData: EventFormData } | null>(null)

function createEmptyFormData(calendarHref: string): EventFormData {
  const now = new Date()
  const start = new Date(now)
  start.setMinutes(0, 0, 0)
  const end = new Date(start)
  end.setHours(end.getHours() + 1)

  return {
    calendarHref,
    summary: '',
    start,
    end,
    allDay: false,
    description: '',
    location: ''
  }
}

export function useEventEditor() {
  const client = getCalDAVClient()

  const isEditing = computed(() => editingEvent.value !== null)

  function openCreate(calendarHref: string, startDate?: Date, endDate?: Date, allDay = false) {
    editingEvent.value = null
    conflictData.value = null
    error.value = null

    const data = createEmptyFormData(calendarHref)
    if (startDate) {
      data.start = startDate
      data.end = endDate || new Date(startDate.getTime() + 3600000)
    }
    data.allDay = allDay

    formData.value = data
    isOpen.value = true
  }

  function openEdit(event: CalendarEvent) {
    editingEvent.value = event
    conflictData.value = null
    error.value = null

    formData.value = {
      uid: event.uid,
      calendarHref: event.calendarHref,
      summary: event.summary,
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay,
      description: event.description || '',
      location: event.location || ''
    }
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    editingEvent.value = null
    conflictData.value = null
    error.value = null
  }

  async function save(): Promise<CalendarEvent | null> {
    saving.value = true
    error.value = null

    try {
      let result: CalendarEvent

      if (editingEvent.value) {
        result = await client.updateEvent(editingEvent.value, formData.value)
      } else {
        result = await client.createEvent(formData.value)
      }

      close()
      return result
    } catch (err) {
      if (err instanceof ConflictError && editingEvent.value) {
        // Fetch the latest version from server
        const serverEvent = await client.fetchSingleEvent(editingEvent.value.href)
        if (serverEvent) {
          conflictData.value = {
            serverEvent,
            localData: { ...formData.value }
          }
        }
      }
      error.value = err instanceof Error ? err : new Error('Failed to save event')
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteEvent(): Promise<boolean> {
    if (!editingEvent.value) return false

    saving.value = true
    error.value = null

    try {
      await client.deleteEvent(editingEvent.value)
      close()
      return true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to delete event')
      return false
    } finally {
      saving.value = false
    }
  }

  function resolveConflictKeepLocal(): void {
    if (conflictData.value) {
      // Update the editing event with the server's etag so next save will work
      if (editingEvent.value) {
        editingEvent.value = {
          ...editingEvent.value,
          etag: conflictData.value.serverEvent.etag
        }
      }
      conflictData.value = null
    }
  }

  function resolveConflictUseServer(): void {
    if (conflictData.value) {
      const serverEvent = conflictData.value.serverEvent
      formData.value = {
        uid: serverEvent.uid,
        calendarHref: serverEvent.calendarHref,
        summary: serverEvent.summary,
        start: new Date(serverEvent.start),
        end: new Date(serverEvent.end),
        allDay: serverEvent.allDay,
        description: serverEvent.description || '',
        location: serverEvent.location || ''
      }
      editingEvent.value = serverEvent
      conflictData.value = null
    }
  }

  return {
    isOpen: readonly(isOpen),
    isEditing,
    editingEvent: readonly(editingEvent),
    formData,
    saving: readonly(saving),
    error: readonly(error),
    conflictData: readonly(conflictData),
    openCreate,
    openEdit,
    close,
    save,
    deleteEvent,
    resolveConflictKeepLocal,
    resolveConflictUseServer
  }
}
