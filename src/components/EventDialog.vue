<script setup lang="ts">
import { computed, watch } from 'vue'
import { useEventEditor } from '../composables/useEventEditor'
import type { Calendar } from '../types/calendar'
import { formatDateForInput, formatTimeForInput } from '../utils/date'

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
  close,
  save,
  deleteEvent,
  resolveConflictKeepLocal,
  resolveConflictUseServer
} = useEventEditor()

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
      // Set times to start/end of day
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
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="ext:fixed ext:inset-0 ext:z-50 ext:flex ext:items-center ext:justify-center ext:bg-black/50"
      @click.self="handleClose"
    >
      <div class="ext:bg-white ext:rounded-lg ext:shadow-xl ext:w-full ext:max-w-lg ext:mx-4">
        <!-- Header -->
        <div class="ext:flex ext:items-center ext:justify-between ext:px-6 ext:py-4 ext:border-b">
          <h2 class="ext:text-lg ext:font-semibold ext:text-gray-900">
            {{ isEditing ? 'Edit Event' : 'New Event' }}
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
        <div v-if="conflictData" class="ext:px-6 ext:py-4 ext:bg-yellow-50 ext:border-b ext:border-yellow-200">
          <p class="ext:text-sm ext:text-yellow-800 ext:mb-3">
            This event was modified by another client. Choose how to resolve:
          </p>
          <div class="ext:flex ext:gap-2">
            <button
              type="button"
              class="ext:px-3 ext:py-1.5 ext:text-sm ext:bg-yellow-600 ext:text-white ext:rounded hover:ext:bg-yellow-700"
              @click="resolveConflictKeepLocal"
            >
              Keep my changes
            </button>
            <button
              type="button"
              class="ext:px-3 ext:py-1.5 ext:text-sm ext:bg-gray-200 ext:text-gray-700 ext:rounded hover:ext:bg-gray-300"
              @click="resolveConflictUseServer"
            >
              Use server version
            </button>
          </div>
        </div>

        <!-- Form -->
        <form class="ext:px-6 ext:py-4 ext:space-y-4" @submit.prevent="handleSave">
          <!-- Title -->
          <div>
            <label for="event-title" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
              Title
            </label>
            <input
              id="event-title"
              v-model="formData.summary"
              type="text"
              required
              class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500 ext:focus:border-blue-500"
              placeholder="Event title"
            />
          </div>

          <!-- Calendar (only for new events) -->
          <div v-if="!isEditing">
            <label for="event-calendar" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
              Calendar
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
              All day event
            </label>
          </div>

          <!-- Start -->
          <div class="ext:grid ext:grid-cols-2 ext:gap-4">
            <div>
              <label for="event-start-date" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
                Start Date
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
                Start Time
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
                End Date
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
                End Time
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

          <!-- Location -->
          <div>
            <label for="event-location" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
              Location
            </label>
            <input
              id="event-location"
              v-model="formData.location"
              type="text"
              class="ext:w-full ext:px-3 ext:py-2 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
              placeholder="Add location"
            />
          </div>

          <!-- Description -->
          <div>
            <label for="event-description" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
              Description
            </label>
            <textarea
              id="event-description"
              v-model="formData.description"
              rows="3"
              class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
              placeholder="Add description"
            />
          </div>

          <!-- Error -->
          <div v-if="error && !conflictData" class="ext:text-sm ext:text-red-600">
            {{ error.message }}
          </div>
        </form>

        <!-- Footer -->
        <div class="ext:flex ext:items-center ext:justify-between ext:px-6 ext:py-4 ext:border-t ext:bg-gray-50">
          <div>
            <button
              v-if="isEditing"
              type="button"
              class="ext:px-4 ext:py-2 ext:text-sm ext:text-red-600 hover:ext:text-red-800"
              :disabled="saving"
              @click="handleDelete"
            >
              Delete
            </button>
          </div>
          <div class="ext:flex ext:gap-3">
            <button
              type="button"
              class="ext:px-4 ext:py-2 ext:text-sm ext:text-gray-700 ext:bg-gray-200 ext:rounded hover:ext:bg-gray-300"
              :disabled="saving"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              type="button"
              class="ext:px-4 ext:py-2 ext:text-sm ext:text-white ext:bg-blue-600 ext:rounded hover:ext:bg-blue-700 disabled:ext:opacity-50"
              :disabled="saving || !formData.summary"
              @click="handleSave"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
