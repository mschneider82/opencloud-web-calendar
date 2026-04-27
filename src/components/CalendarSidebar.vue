<script setup lang="ts">
import type { Calendar } from '../types/calendar'
import { t } from '../composables/useLanguage'

defineProps<{
  calendars: readonly Calendar[]
  loading: boolean
  isOpen: boolean
}>()

const emit = defineEmits<{
  toggle: [calendarHref: string]
  create: []
  delete: [calendarHref: string]
  import: []
}>()
</script>

<template>
  <aside
    :class="[
      'ext:w-56 sm:ext:w-64 ext:border-r ext:border-gray-200 ext:bg-gray-50 ext:overflow-y-auto ext:shrink-0',
      'ext:absolute ext:inset-y-0 ext:left-0 ext:z-20 ext:transition-transform ext:duration-200 ext:will-change-transform',
      'sm:ext:static sm:ext:z-auto sm:ext:transition-none sm:ext:shadow-none',
      isOpen ? 'ext:translate-x-0 ext:shadow-lg' : 'ext:-translate-x-full sm:ext:translate-x-0'
    ]"
  >
    <div class="ext:p-4">
      <div class="ext:flex ext:items-center ext:justify-between ext:mb-3">
        <h3 class="ext:text-sm ext:font-semibold ext:text-gray-600 ext:uppercase ext:tracking-wide">
          {{ t('Calendars') }}
        </h3>
        <div class="ext:flex ext:items-center ext:gap-1">
          <button
            type="button"
            class="ext:p-1 ext:text-blue-600 hover:ext:bg-blue-50 ext:rounded"
            :title="t('Import calendar')"
            @click="emit('import')"
          >
            <svg class="ext:w-5 ext:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <button
            type="button"
            class="ext:p-1 ext:text-blue-600 hover:ext:bg-blue-50 ext:rounded"
            :title="t('Create new calendar')"
            @click="emit('create')"
          >
            <svg class="ext:w-5 ext:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="loading" class="ext:text-sm ext:text-gray-500">
        {{ t('Loading calendars...') }}
      </div>

      <div v-else-if="calendars.length === 0" class="ext:text-sm ext:text-gray-500">
        {{ t('No calendars found') }}
      </div>

      <ul v-else class="ext:space-y-2">
        <li
          v-for="calendar in calendars"
          :key="calendar.href"
          class="ext:group ext:flex ext:items-center ext:gap-2"
        >
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
          <button
            type="button"
            class="ext:p-1 ext:text-gray-400 hover:ext:text-red-600 ext:transition-colors ext:flex-shrink-0"
            :title="t('Delete calendar')"
            @click.stop="emit('delete', calendar.href)"
          >
            <svg class="ext:w-4 ext:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>
