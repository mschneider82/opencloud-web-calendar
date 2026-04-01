<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useEventEditor } from '../composables/useEventEditor'
import type { Calendar, RecurrenceFormData } from '../types/calendar'
import { formatDateForInput, formatTimeForInput } from '../utils/date'
import { t } from '../composables/useLanguage'

const props = defineProps<{
  calendars: readonly Calendar[]
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const {
  isOpen,
  isEditing,
  formData,
  saving,
  error,
  conflictData,
  editScope,
  showScopeDialog,
  close,
  save,
  deleteEvent,
  selectEditScope,
  cancelScopeDialog,
  resolveConflictKeepLocal,
  resolveConflictUseServer
} = useEventEditor()

const WEEKDAYS = [
  { value: 'MO', label: 'Mon' },
  { value: 'TU', label: 'Tue' },
  { value: 'WE', label: 'Wed' },
  { value: 'TH', label: 'Thu' },
  { value: 'FR', label: 'Fri' },
  { value: 'SA', label: 'Sat' },
  { value: 'SU', label: 'Sun' }
]

const hasRecurrence = computed({
  get: () => !!formData.value.recurrence,
  set: (val: boolean) => {
    if (val) {
      formData.value.recurrence = {
        frequency: 'WEEKLY',
        interval: 1,
        endType: 'never'
      }
    } else {
      formData.value.recurrence = undefined
    }
  }
})

const recurrenceFrequency = computed({
  get: () => formData.value.recurrence?.frequency || 'WEEKLY',
  set: (val: RecurrenceFormData['frequency']) => {
    if (formData.value.recurrence) {
      formData.value.recurrence = { ...formData.value.recurrence, frequency: val }
    }
  }
})

const recurrenceInterval = computed({
  get: () => formData.value.recurrence?.interval || 1,
  set: (val: number) => {
    if (formData.value.recurrence) {
      formData.value.recurrence = { ...formData.value.recurrence, interval: val }
    }
  }
})

const recurrenceEndType = computed({
  get: () => formData.value.recurrence?.endType || 'never',
  set: (val: RecurrenceFormData['endType']) => {
    if (formData.value.recurrence) {
      formData.value.recurrence = { ...formData.value.recurrence, endType: val }
    }
  }
})

const recurrenceCount = computed({
  get: () => formData.value.recurrence?.count || 10,
  set: (val: number) => {
    if (formData.value.recurrence) {
      formData.value.recurrence = { ...formData.value.recurrence, count: val }
    }
  }
})

const recurrenceUntil = computed({
  get: () => {
    const d = formData.value.recurrence?.until
    return d ? formatDateForInput(d) : ''
  },
  set: (val: string) => {
    if (formData.value.recurrence && val) {
      formData.value.recurrence = { ...formData.value.recurrence, until: new Date(val + 'T23:59:59') }
    }
  }
})

const frequencyLabel = computed(() => {
  const labels: Record<string, string> = {
    DAILY: t('day(s)'),
    WEEKLY: t('week(s)'),
    MONTHLY: t('month(s)'),
    YEARLY: t('year(s)')
  }
  return labels[recurrenceFrequency.value] || ''
})

function isWeekdaySelected(day: string): boolean {
  return formData.value.recurrence?.byDay?.includes(day) || false
}

function toggleWeekday(day: string) {
  if (!formData.value.recurrence) return
  const current = formData.value.recurrence.byDay || []
  const newDays = current.includes(day)
    ? current.filter((d) => d !== day)
    : [...current, day]
  formData.value.recurrence = { ...formData.value.recurrence, byDay: newDays.length > 0 ? newDays : undefined }
}

const startDate = computed({
  get: () => formatDateForInput(formData.value.start),
  set: (val: string) => {
    const newDate = new Date(val + 'T' + formatTimeForInput(formData.value.start))
    formData.value.start = newDate
  }
})

const startTime = computed({
  get: () => formatTimeForInput(formData.value.start),
  set: (val: string) => {
    const newDate = new Date(formatDateForInput(formData.value.start) + 'T' + val)
    formData.value.start = newDate
  }
})

const endDate = computed({
  get: () => formatDateForInput(formData.value.end),
  set: (val: string) => {
    const newDate = new Date(val + 'T' + formatTimeForInput(formData.value.end))
    formData.value.end = newDate
  }
})

const endTime = computed({
  get: () => formatTimeForInput(formData.value.end),
  set: (val: string) => {
    const newDate = new Date(formatDateForInput(formData.value.end) + 'T' + val)
    formData.value.end = newDate
  }
})

watch(
  () => formData.value.allDay,
  (allDay) => {
    if (allDay) {
      const start = new Date(formData.value.start)
      start.setHours(0, 0, 0, 0)
      formData.value.start = start

      const end = new Date(formData.value.end)
      end.setHours(23, 59, 59, 999)
      formData.value.end = end
    }
  }
)

async function handleSave() {
  const result = await save()
  if (result) {
    emit('saved')
  }
}

async function handleDelete() {
  const success = await deleteEvent()
  if (success) {
    emit('deleted')
  }
}

function handleClose() {
  close()
}
</script>

<template>
  <!-- Edit Scope Dialog for recurring events -->
  <Teleport to="body">
    <div
      v-if="showScopeDialog"
      class="ext:fixed ext:inset-0 ext:z-50 ext:flex ext:items-center ext:justify-center ext:bg-black/50"
      @click.self="cancelScopeDialog"
    >
      <div class="ext:bg-white ext:rounded-lg ext:shadow-xl ext:w-full ext:max-w-sm ext:mx-4">
        <div class="ext:px-6 ext:py-4 ext:border-b">
          <h2 class="ext:text-lg ext:font-semibold ext:text-gray-900">
            {{ t('Edit Recurring Event') }}
          </h2>
        </div>
        <div class="ext:px-6 ext:py-4 ext:space-y-3">
          <p class="ext:text-sm ext:text-gray-600">
            {{ t('This is a recurring event. What would you like to edit?') }}
          </p>
          <button
            type="button"
            class="ext:w-full ext:px-4 ext:py-2 ext:text-sm ext:text-left ext:text-gray-900 ext:bg-gray-100 ext:rounded hover:ext:bg-gray-200"
            @click="selectEditScope('single')"
          >
            {{ t('This event only') }}
          </button>
          <button
            type="button"
            class="ext:w-full ext:px-4 ext:py-2 ext:text-sm ext:text-left ext:text-gray-900 ext:bg-gray-100 ext:rounded hover:ext:bg-gray-200"
            @click="selectEditScope('series')"
          >
            {{ t('All events in series') }}
          </button>
        </div>
        <div class="ext:px-6 ext:py-4 ext:border-t ext:bg-gray-50 ext:flex ext:justify-end">
          <button
            type="button"
            class="ext:px-4 ext:py-2 ext:text-sm ext:text-gray-700 ext:bg-gray-200 ext:rounded hover:ext:bg-gray-300"
            @click="cancelScopeDialog"
          >
            {{ t('Cancel') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Main Event Dialog -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="ext:fixed ext:inset-0 ext:z-50 ext:flex ext:items-center ext:justify-center ext:bg-black/50"
      @click.self="handleClose"
    >
      <div class="ext:bg-white ext:rounded-lg ext:shadow-xl ext:w-full ext:max-w-lg ext:mx-4 ext:max-h-[90vh] ext:flex ext:flex-col">
        <!-- Header -->
        <div class="ext:flex ext:items-center ext:justify-between ext:px-6 ext:py-4 ext:border-b ext:shrink-0">
          <h2 class="ext:text-lg ext:font-semibold ext:text-gray-900">
            {{ isEditing ? t('Edit Event') : t('New Event') }}
            <span v-if="editScope === 'single'" class="ext:text-sm ext:font-normal ext:text-gray-500">
              — {{ t('this occurrence') }}
            </span>
            <span v-else-if="editScope === 'series'" class="ext:text-sm ext:font-normal ext:text-gray-500">
              — {{ t('entire series') }}
            </span>
          </h2>
          <button
            type="button"
            class="ext:text-gray-500 hover:ext:text-gray-700"
            @click="handleClose"
          >
            <svg class="ext:w-6 ext:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Conflict Warning -->
        <div v-if="conflictData" class="ext:px-6 ext:py-4 ext:bg-yellow-50 ext:border-b ext:border-yellow-200 ext:shrink-0">
          <p class="ext:text-sm ext:text-yellow-800 ext:mb-3">
            {{ t('This event was modified by another client. Choose how to resolve:') }}
          </p>
          <div class="ext:flex ext:gap-2">
            <button
              type="button"
              class="ext:px-3 ext:py-1.5 ext:text-sm ext:bg-yellow-600 ext:text-white ext:rounded hover:ext:bg-yellow-700"
              @click="resolveConflictKeepLocal"
            >
              {{ t('Keep my changes') }}
            </button>
            <button
              type="button"
              class="ext:px-3 ext:py-1.5 ext:text-sm ext:bg-gray-200 ext:text-gray-700 ext:rounded hover:ext:bg-gray-300"
              @click="resolveConflictUseServer"
            >
              {{ t('Use server version') }}
            </button>
          </div>
        </div>

        <!-- Form (scrollable) -->
        <form class="ext:px-6 ext:py-4 ext:space-y-4 ext:overflow-y-auto ext:flex-1" @submit.prevent="handleSave">
          <!-- Title -->
          <div>
            <label for="event-title" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
              {{ t('Title') }}
            </label>
            <input
              id="event-title"
              v-model="formData.summary"
              type="text"
              required
              class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500 ext:focus:border-blue-500"
              :placeholder="t('Event title')"
            />
          </div>

          <!-- Calendar (only for new events) -->
          <div v-if="!isEditing">
            <label for="event-calendar" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
              {{ t('Calendar') }}
            </label>
            <select
              id="event-calendar"
              v-model="formData.calendarHref"
              class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
            >
              <option v-for="cal in calendars" :key="cal.href" :value="cal.href">
                {{ cal.displayName }}
              </option>
            </select>
          </div>

          <!-- All Day -->
          <div class="ext:flex ext:items-center ext:gap-2">
            <input
              id="event-allday"
              v-model="formData.allDay"
              type="checkbox"
              class="ext:w-4 ext:h-4 ext:rounded ext:border-gray-300"
            />
            <label for="event-allday" class="ext:text-sm ext:font-medium ext:text-gray-900">
              {{ t('All day event') }}
            </label>
          </div>

          <!-- Start -->
          <div class="ext:grid ext:grid-cols-2 ext:gap-4">
            <div>
              <label for="event-start-date" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
                {{ t('Start Date') }}
              </label>
              <input
                id="event-start-date"
                v-model="startDate"
                type="date"
                required
                class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
              />
            </div>
            <div v-if="!formData.allDay">
              <label for="event-start-time" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
                {{ t('Start Time') }}
              </label>
              <input
                id="event-start-time"
                v-model="startTime"
                type="time"
                required
                class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- End -->
          <div class="ext:grid ext:grid-cols-2 ext:gap-4">
            <div>
              <label for="event-end-date" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
                {{ t('End Date') }}
              </label>
              <input
                id="event-end-date"
                v-model="endDate"
                type="date"
                required
                class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
              />
            </div>
            <div v-if="!formData.allDay">
              <label for="event-end-time" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
                {{ t('End Time') }}
              </label>
              <input
                id="event-end-time"
                v-model="endTime"
                type="time"
                required
                class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Recurrence (hidden when editing single occurrence) -->
          <div v-if="editScope !== 'single'" class="ext:space-y-3">
            <div class="ext:flex ext:items-center ext:gap-2">
              <input
                id="event-repeat"
                v-model="hasRecurrence"
                type="checkbox"
                class="ext:w-4 ext:h-4 ext:rounded ext:border-gray-300"
              />
              <label for="event-repeat" class="ext:text-sm ext:font-medium ext:text-gray-900">
                {{ t('Repeat') }}
              </label>
            </div>

            <div v-if="hasRecurrence" class="ext:pl-6 ext:space-y-3 ext:border-l-2 ext:border-blue-200">
              <!-- Frequency + Interval -->
              <div class="ext:flex ext:items-center ext:gap-2">
                <label class="ext:text-sm ext:text-gray-700">{{ t('Every') }}</label>
                <input
                  v-model.number="recurrenceInterval"
                  type="number"
                  min="1"
                  max="99"
                  class="ext:w-16 ext:px-2 ext:py-1 ext:text-sm ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
                />
                <select
                  v-model="recurrenceFrequency"
                  class="ext:px-2 ext:py-1 ext:text-sm ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
                >
                  <option value="DAILY">{{ t('day(s)') }}</option>
                  <option value="WEEKLY">{{ t('week(s)') }}</option>
                  <option value="MONTHLY">{{ t('month(s)') }}</option>
                  <option value="YEARLY">{{ t('year(s)') }}</option>
                </select>
              </div>

              <!-- Weekly: day picker -->
              <div v-if="recurrenceFrequency === 'WEEKLY'" class="ext:flex ext:flex-wrap ext:gap-1">
                <button
                  v-for="day in WEEKDAYS"
                  :key="day.value"
                  type="button"
                  class="ext:px-2 ext:py-1 ext:text-xs ext:rounded ext:border ext:transition-colors"
                  :class="isWeekdaySelected(day.value)
                    ? 'ext:bg-blue-600 ext:text-white ext:border-blue-600'
                    : 'ext:bg-white ext:text-gray-700 ext:border-gray-300 hover:ext:bg-gray-100'"
                  @click="toggleWeekday(day.value)"
                >
                  {{ t(day.label) }}
                </button>
              </div>

              <!-- End condition -->
              <div class="ext:space-y-2">
                <label class="ext:text-sm ext:font-medium ext:text-gray-700">{{ t('Ends') }}</label>

                <div class="ext:flex ext:items-center ext:gap-2">
                  <input
                    id="end-never"
                    v-model="recurrenceEndType"
                    type="radio"
                    value="never"
                    class="ext:w-4 ext:h-4"
                  />
                  <label for="end-never" class="ext:text-sm ext:text-gray-900">{{ t('Never') }}</label>
                </div>

                <div class="ext:flex ext:items-center ext:gap-2">
                  <input
                    id="end-count"
                    v-model="recurrenceEndType"
                    type="radio"
                    value="count"
                    class="ext:w-4 ext:h-4"
                  />
                  <label for="end-count" class="ext:text-sm ext:text-gray-900">{{ t('After') }}</label>
                  <input
                    v-model.number="recurrenceCount"
                    type="number"
                    min="1"
                    max="999"
                    :disabled="recurrenceEndType !== 'count'"
                    class="ext:w-20 ext:px-2 ext:py-1 ext:text-sm ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded disabled:ext:opacity-50"
                  />
                  <span class="ext:text-sm ext:text-gray-700">{{ t('occurrences') }}</span>
                </div>

                <div class="ext:flex ext:items-center ext:gap-2">
                  <input
                    id="end-until"
                    v-model="recurrenceEndType"
                    type="radio"
                    value="until"
                    class="ext:w-4 ext:h-4"
                  />
                  <label for="end-until" class="ext:text-sm ext:text-gray-900">{{ t('On') }}</label>
                  <input
                    v-model="recurrenceUntil"
                    type="date"
                    :disabled="recurrenceEndType !== 'until'"
                    class="ext:px-2 ext:py-1 ext:text-sm ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded disabled:ext:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Location -->
          <div>
            <label for="event-location" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
              {{ t('Location') }}
            </label>
            <input
              id="event-location"
              v-model="formData.location"
              type="text"
              class="ext:w-full ext:px-3 ext:py-2 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
              :placeholder="t('Add location')"
            />
          </div>

          <!-- Description -->
          <div>
            <label for="event-description" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
              {{ t('Description') }}
            </label>
            <textarea
              id="event-description"
              v-model="formData.description"
              rows="3"
              class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
              :placeholder="t('Add description')"
            />
          </div>

          <!-- Error -->
          <div v-if="error && !conflictData" class="ext:text-sm ext:text-red-600">
            {{ error.message }}
          </div>
        </form>

        <!-- Footer -->
        <div class="ext:flex ext:items-center ext:justify-between ext:px-6 ext:py-4 ext:border-t ext:bg-gray-50 ext:shrink-0">
          <div>
            <button
              v-if="isEditing"
              type="button"
              class="ext:px-4 ext:py-2 ext:text-sm ext:text-red-600 hover:ext:text-red-800"
              :disabled="saving"
              @click="handleDelete"
            >
              {{ editScope === 'single' ? t('Delete this event') : t('Delete') }}
            </button>
          </div>
          <div class="ext:flex ext:gap-3">
            <button
              type="button"
              class="ext:px-4 ext:py-2 ext:text-sm ext:text-gray-700 ext:bg-gray-200 ext:rounded hover:ext:bg-gray-300"
              :disabled="saving"
              @click="handleClose"
            >
              {{ t('Cancel') }}
            </button>
            <button
              type="button"
              class="ext:px-4 ext:py-2 ext:text-sm ext:text-white ext:bg-blue-600 ext:rounded hover:ext:bg-blue-700 disabled:ext:opacity-50"
              :disabled="saving || !formData.summary"
              @click="handleSave"
            >
              {{ saving ? t('Saving...') : t('Save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
