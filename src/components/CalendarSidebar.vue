<script setup lang="ts">
import type { Calendar } from '../types/calendar'

defineProps<{
  calendars: readonly Calendar[]
  loading: boolean
}>()

const emit = defineEmits<{
  toggle: [calendarHref: string]
}>()
</script>

<template>
  <aside class="ext:w-64 ext:border-r ext:border-gray-200 ext:p-4 ext:bg-gray-50">
    <h3 class="ext:text-sm ext:font-semibold ext:text-gray-600 ext:uppercase ext:tracking-wide ext:mb-3">
      Calendars
    </h3>

    <div v-if="loading" class="ext:text-sm ext:text-gray-500">
      Loading calendars...
    </div>

    <div v-else-if="calendars.length === 0" class="ext:text-sm ext:text-gray-500">
      No calendars found
    </div>

    <ul v-else class="ext:space-y-2">
      <li v-for="calendar in calendars" :key="calendar.href" class="ext:flex ext:items-center ext:gap-2">
        <input
          :id="`cal-${calendar.href}`"
          type="checkbox"
          :checked="calendar.visible"
          class="ext:w-4 ext:h-4 ext:rounded ext:border-gray-300"
          :style="{ accentColor: calendar.color }"
          @change="emit('toggle', calendar.href)"
        />
        <label
          :for="`cal-${calendar.href}`"
          class="ext:flex ext:items-center ext:gap-2 ext:text-sm ext:text-gray-900 ext:cursor-pointer ext:flex-1"
        >
          <span
            class="ext:w-3 ext:h-3 ext:rounded-full ext:flex-shrink-0"
            :style="{ backgroundColor: calendar.color }"
          />
          <span class="ext:truncate">{{ calendar.displayName }}</span>
        </label>
      </li>
    </ul>
  </aside>
</template>
