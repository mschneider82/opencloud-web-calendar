import { ref, readonly } from 'vue'
import { getCalDAVClient, type CreateCalendarData } from '../caldav/client'

const isOpen = ref(false)
const formData = ref<CreateCalendarData>(createEmptyFormData())
const saving = ref(false)
const error = ref<Error | null>(null)

function createEmptyFormData(): CreateCalendarData {
  return {
    displayName: '',
    description: '',
    color: '#3788d8'
  }
}

export function useCalendarEditor() {
  const client = getCalDAVClient()

  function open() {
    formData.value = createEmptyFormData()
    error.value = null
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    error.value = null
  }

  async function save(calendarHomeUrl: string): Promise<boolean> {
    saving.value = true
    error.value = null

    try {
      await client.createCalendar(calendarHomeUrl, formData.value)
      close()
      return true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to create calendar')
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    isOpen: readonly(isOpen),
    formData,
    saving: readonly(saving),
    error: readonly(error),
    open,
    close,
    save
  }
}
