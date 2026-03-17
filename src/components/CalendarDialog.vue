<script setup lang="ts">
import { useCalendarEditor } from '../composables/useCalendarEditor'
import { t } from '../composables/useLanguage'

const props = defineProps<{
  calendarHomeUrl: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const { isOpen, formData, saving, error, close, save } = useCalendarEditor()

// Preset colors matching common calendar apps
const presetColors = [
  '#3788d8', // Blue (default)
  '#22c55e', // Green
  '#ef4444', // Red
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16' // Lime
]

async function handleSave() {
  const success = await save(props.calendarHomeUrl)
  if (success) {
    emit('saved')
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
      <div class="ext:bg-white ext:rounded-lg ext:shadow-xl ext:w-full ext:max-w-md ext:mx-4">
        <!-- Header -->
        <div class="ext:flex ext:items-center ext:justify-between ext:px-6 ext:py-4 ext:border-b">
          <h2 class="ext:text-lg ext:font-semibold ext:text-gray-900">{{ t('New Calendar') }}</h2>
          <button
            type="button"
            class="ext:text-gray-500 hover:ext:text-gray-700"
            @click="handleClose"
          >
            <svg class="ext:w-6 ext:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Form -->
        <form class="ext:px-6 ext:py-4 ext:space-y-4" @submit.prevent="handleSave">
          <!-- Display Name -->
          <div>
            <label
              for="calendar-name"
              class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1"
            >
              {{ t('Calendar Name') }}
            </label>
            <input
              id="calendar-name"
              v-model="formData.displayName"
              type="text"
              required
              class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500 ext:focus:border-blue-500"
              :placeholder="t('My Calendar')"
            />
          </div>

          <!-- Description -->
          <div>
            <label
              for="calendar-description"
              class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1"
            >
              {{ t('Description (optional)') }}
            </label>
            <textarea
              id="calendar-description"
              v-model="formData.description"
              rows="2"
              class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500"
              :placeholder="t('Calendar description')"
            />
          </div>

          <!-- Color -->
          <div>
            <label class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-2">
              {{ t('Color') }}
            </label>
            <div class="ext:grid ext:grid-cols-8 ext:gap-2">
              <button
                v-for="color in presetColors"
                :key="color"
                type="button"
                class="ext:w-8 ext:h-8 ext:rounded-full ext:border-2 ext:transition-all"
                :class="
                  formData.color === color
                    ? 'ext:border-gray-900 ext:scale-110'
                    : 'ext:border-gray-300'
                "
                :style="{ backgroundColor: color }"
                @click="formData.color = color"
              />
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="ext:text-sm ext:text-red-600">
            {{ error.message }}
          </div>
        </form>

        <!-- Footer -->
        <div
          class="ext:flex ext:items-center ext:justify-end ext:gap-3 ext:px-6 ext:py-4 ext:border-t ext:bg-gray-50"
        >
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
            :disabled="saving || !formData.displayName"
            @click="handleSave"
          >
            {{ saving ? t('Creating...') : t('Create') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
