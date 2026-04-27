<script setup lang="ts">
import { computed } from 'vue'
import { t, getLanguage } from '../composables/useLanguage'

const props = defineProps<{
  currentDate: Date
  viewType: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'
}>()

const emit = defineEmits<{
  prev: []
  next: []
  today: []
  'change-view': [view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay']
  'toggle-sidebar': []
}>()

const locale = computed(() => getLanguage())

const title = computed(() => {
  const date = props.currentDate
  if (props.viewType === 'timeGridDay') {
    return date.toLocaleDateString(locale.value, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  if (props.viewType === 'timeGridWeek') {
    return date.toLocaleDateString(locale.value, {
      year: 'numeric',
      month: 'long'
    })
  }
  return date.toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long'
  })
})
</script>

<template>
  <div class="ext:border-b ext:border-gray-200 ext:bg-white ext:px-3 sm:ext:px-4 ext:py-2 sm:ext:py-3">
    <!-- Controls row: nav buttons + (desktop) title on left, view switcher on right -->
    <div class="ext:flex ext:items-center ext:justify-between">
      <div class="ext:flex ext:items-center ext:gap-1.5 sm:ext:gap-2">
        <!-- Sidebar toggle: mobile only -->
        <button
          type="button"
          class="sm:ext:hidden ext:p-1.5 ext:text-gray-700 ext:rounded ext:border ext:border-gray-300 ext:bg-white hover:ext:bg-gray-50"
          :title="t('Toggle sidebar')"
          @click="emit('toggle-sidebar')"
        >
          <svg class="ext:w-5 ext:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        <button
          type="button"
          class="ext:px-2.5 sm:ext:px-3 ext:py-1.5 ext:text-sm ext:font-medium ext:text-gray-700 ext:rounded ext:border ext:border-gray-300 ext:bg-white hover:ext:bg-gray-50"
          @click="emit('today')"
        >
          {{ t('Today') }}
        </button>
        <button
          type="button"
          class="ext:p-1.5 ext:text-gray-700 ext:rounded ext:border ext:border-gray-300 ext:bg-white hover:ext:bg-gray-50"
          @click="emit('prev')"
        >
          <svg class="ext:w-4 ext:h-4 sm:ext:w-5 sm:ext:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          class="ext:p-1.5 ext:text-gray-700 ext:rounded ext:border ext:border-gray-300 ext:bg-white hover:ext:bg-gray-50"
          @click="emit('next')"
        >
          <svg class="ext:w-4 ext:h-4 sm:ext:w-5 sm:ext:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Title: only visible on sm+ in this row -->
        <h2 class="ext:hidden sm:ext:block ext:text-xl ext:font-semibold ext:text-gray-900 ext:ml-2 sm:ext:ml-4 ext:truncate">
          {{ title }}
        </h2>
      </div>

      <!-- View switcher -->
      <div class="ext:flex ext:rounded ext:border ext:border-gray-300 ext:overflow-hidden">
        <button
          type="button"
          :class="[
            'ext:px-2.5 sm:ext:px-3 ext:py-1.5 ext:text-sm ext:font-medium',
            viewType === 'dayGridMonth' ? 'ext:bg-blue-500 ext:text-white' : 'ext:bg-white ext:text-gray-700 hover:ext:bg-gray-50'
          ]"
          @click="emit('change-view', 'dayGridMonth')"
        >
          {{ t('Month') }}
        </button>
        <button
          type="button"
          :class="[
            'ext:px-2.5 sm:ext:px-3 ext:py-1.5 ext:text-sm ext:font-medium ext:border-l ext:border-gray-300',
            viewType === 'timeGridWeek' ? 'ext:bg-blue-500 ext:text-white' : 'ext:bg-white ext:text-gray-700 hover:ext:bg-gray-50'
          ]"
          @click="emit('change-view', 'timeGridWeek')"
        >
          {{ t('Week') }}
        </button>
        <button
          type="button"
          :class="[
            'ext:px-2.5 sm:ext:px-3 ext:py-1.5 ext:text-sm ext:font-medium ext:border-l ext:border-gray-300',
            viewType === 'timeGridDay' ? 'ext:bg-blue-500 ext:text-white' : 'ext:bg-white ext:text-gray-700 hover:ext:bg-gray-50'
          ]"
          @click="emit('change-view', 'timeGridDay')"
        >
          {{ t('Day') }}
        </button>
      </div>
    </div>

    <!-- Title row: mobile only (below controls) -->
    <h2 class="sm:ext:hidden ext:text-base ext:font-semibold ext:text-gray-900 ext:mt-1.5 ext:truncate">
      {{ title }}
    </h2>
  </div>
</template>
