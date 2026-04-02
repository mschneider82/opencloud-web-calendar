<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useICSImport, type ImportMode } from '../composables/useICSImport'
import type { Calendar } from '../types/calendar'
import { t } from '../composables/useLanguage'

const props = defineProps<{
  calendars: readonly Calendar[]
  calendarHomeUrl: string
  defaultCalendar: Calendar | null
}>()

const emit = defineEmits<{
  imported: []
}>()

const {
  isOpen,
  phase,
  progress,
  report,
  error,
  open,
  close,
  importFile
} = useICSImport()

const selectedFile = ref<File | null>(null)
const importMode = ref<ImportMode>('new-calendar')
const newCalendarName = ref('')
const selectedMergeCalendar = ref<Calendar | null>(null)
const showDetails = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

// Pre-select default calendar when switching to merge mode
watch(importMode, (mode) => {
  if (mode === 'merge' && !selectedMergeCalendar.value && props.defaultCalendar) {
    selectedMergeCalendar.value = props.defaultCalendar
  }
})

const canImport = computed(() => {
  if (!selectedFile.value) return false
  if (importMode.value === 'new-calendar' && !newCalendarName.value.trim()) return false
  if (importMode.value === 'merge' && !selectedMergeCalendar.value) return false
  return true
})

const progressPercent = computed(() => {
  if (progress.value.total === 0) return 0
  return Math.round((progress.value.current / progress.value.total) * 100)
})

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
    // Suggest calendar name from filename
    if (importMode.value === 'new-calendar' && !newCalendarName.value) {
      newCalendarName.value = input.files[0].name.replace(/\.ics$/i, '')
    }
  }
}

async function handleImport() {
  if (!selectedFile.value) return

  await importFile(
    selectedFile.value,
    importMode.value,
    newCalendarName.value,
    importMode.value === 'merge' ? selectedMergeCalendar.value : null,
    props.calendarHomeUrl,
    props.calendars
  )

  if (phase.value === 'done') {
    emit('imported')
  }
}

function handleClose() {
  selectedFile.value = null
  newCalendarName.value = ''
  selectedMergeCalendar.value = null
  importMode.value = 'new-calendar'
  showDetails.value = false
  close()
}

function resetForRetry() {
  selectedFile.value = null
  newCalendarName.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

defineExpose({ open })
</script>

<template>
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
            {{ t('Import Calendar') }}
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

        <!-- Content -->
        <div class="ext:px-6 ext:py-4 ext:space-y-4 ext:overflow-y-auto ext:flex-1">

          <!-- Phase: idle / error — show form -->
          <template v-if="phase === 'idle' || phase === 'error'">
            <!-- File picker -->
            <div>
              <label class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
                {{ t('ICS File') }}
              </label>
              <input
                ref="fileInputRef"
                type="file"
                accept=".ics,text/calendar"
                class="ext:w-full ext:text-sm ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:p-2
                       file:ext:mr-3 file:ext:py-1 file:ext:px-3 file:ext:rounded file:ext:border-0
                       file:ext:text-sm file:ext:font-medium file:ext:bg-blue-600 file:ext:text-white
                       file:ext:cursor-pointer hover:file:ext:bg-blue-700"
                @change="handleFileSelect"
              />
              <p v-if="selectedFile" class="ext:mt-1 ext:text-xs ext:text-gray-500">
                {{ selectedFile.name }} ({{ (selectedFile.size / 1024).toFixed(1) }} KB)
              </p>
            </div>

            <!-- Mode selection -->
            <div class="ext:space-y-2">
              <label class="ext:block ext:text-sm ext:font-medium ext:text-gray-700">
                {{ t('Import mode') }}
              </label>
              <div class="ext:flex ext:items-center ext:gap-2">
                <input
                  id="mode-new"
                  v-model="importMode"
                  type="radio"
                  value="new-calendar"
                  class="ext:w-4 ext:h-4"
                />
                <label for="mode-new" class="ext:text-sm ext:text-gray-900">
                  {{ t('Create new calendar') }}
                </label>
              </div>
              <div class="ext:flex ext:items-center ext:gap-2">
                <input
                  id="mode-merge"
                  v-model="importMode"
                  type="radio"
                  value="merge"
                  :disabled="calendars.length === 0"
                  class="ext:w-4 ext:h-4"
                />
                <label for="mode-merge" class="ext:text-sm ext:text-gray-900">
                  {{ t('Merge into existing calendar') }}
                </label>
              </div>
            </div>

            <!-- Calendar selector (merge mode) -->
            <div v-if="importMode === 'merge'">
              <label for="merge-target" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
                {{ t('Target calendar') }}
              </label>
              <select
                id="merge-target"
                :value="selectedMergeCalendar?.href ?? ''"
                class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500 ext:focus:border-blue-500 ext:bg-white"
                @change="selectedMergeCalendar = calendars.find(c => c.href === ($event.target as HTMLSelectElement).value) ?? null"
              >
                <option value="" disabled>{{ t('Select calendar') }}</option>
                <option
                  v-for="cal in calendars"
                  :key="cal.href"
                  :value="cal.href"
                >
                  {{ cal.displayName }}
                </option>
              </select>
            </div>

            <!-- Calendar name (new calendar mode) -->
            <div v-if="importMode === 'new-calendar'">
              <label for="import-cal-name" class="ext:block ext:text-sm ext:font-medium ext:text-gray-700 ext:mb-1">
                {{ t('Calendar Name') }}
              </label>
              <input
                id="import-cal-name"
                v-model="newCalendarName"
                type="text"
                required
                class="ext:w-full ext:px-3 ext:py-2 ext:text-gray-900 ext:border ext:border-gray-300 ext:rounded ext:focus:ring-2 ext:focus:ring-blue-500 ext:focus:border-blue-500"
                :placeholder="t('Enter calendar name')"
              />
            </div>

            <!-- Error display -->
            <div v-if="error" class="ext:p-3 ext:bg-red-50 ext:border ext:border-red-200 ext:rounded">
              <p class="ext:text-sm ext:text-red-600 ext:whitespace-pre-line">{{ error }}</p>
            </div>
          </template>

          <!-- Phase: reading/parsing/analyzing/importing — show progress -->
          <template v-if="phase === 'reading' || phase === 'parsing' || phase === 'analyzing' || phase === 'importing'">
            <div class="ext:space-y-3">
              <p class="ext:text-sm ext:text-gray-700">
                <template v-if="phase === 'reading'">{{ t('Reading file...') }}</template>
                <template v-else-if="phase === 'parsing'">{{ t('Parsing events...') }}</template>
                <template v-else-if="phase === 'analyzing'">{{ t('Analyzing for duplicates...') }}</template>
                <template v-else-if="phase === 'importing'">
                  {{ t('Importing events...') }} ({{ progress.current }}/{{ progress.total }})
                </template>
              </p>
              <div class="ext:w-full ext:bg-gray-200 ext:rounded-full ext:h-2">
                <div
                  class="ext:bg-blue-600 ext:h-2 ext:rounded-full ext:transition-all ext:duration-300"
                  :style="{ width: phase === 'importing' ? progressPercent + '%' : '100%' }"
                  :class="{ 'ext:animate-pulse': phase !== 'importing' }"
                />
              </div>
            </div>
          </template>

          <!-- Phase: done — show report -->
          <template v-if="phase === 'done' && report">
            <div class="ext:space-y-3">
              <!-- Summary -->
              <div class="ext:grid ext:grid-cols-2 ext:gap-2">
                <div class="ext:p-3 ext:bg-green-50 ext:rounded ext:text-center">
                  <div class="ext:text-2xl ext:font-bold ext:text-green-700">{{ report.created }}</div>
                  <div class="ext:text-xs ext:text-green-600">{{ t('Created') }}</div>
                </div>
                <div v-if="report.mode === 'merge'" class="ext:p-3 ext:bg-blue-50 ext:rounded ext:text-center">
                  <div class="ext:text-2xl ext:font-bold ext:text-blue-700">{{ report.updated }}</div>
                  <div class="ext:text-xs ext:text-blue-600">{{ t('Updated') }}</div>
                </div>
                <div v-if="report.skipped > 0" class="ext:p-3 ext:bg-gray-100 ext:rounded ext:text-center">
                  <div class="ext:text-2xl ext:font-bold ext:text-gray-700">{{ report.skipped }}</div>
                  <div class="ext:text-xs ext:text-gray-600">{{ t('Skipped') }}</div>
                </div>
                <div v-if="report.failed > 0" class="ext:p-3 ext:bg-red-50 ext:rounded ext:text-center">
                  <div class="ext:text-2xl ext:font-bold ext:text-red-700">{{ report.failed }}</div>
                  <div class="ext:text-xs ext:text-red-600">{{ t('Failed') }}</div>
                </div>
              </div>

              <p class="ext:text-sm ext:text-gray-600">
                {{ t('Imported %{count} events into "%{name}"', { count: String(report.created + report.updated), name: report.calendarName }) }}
              </p>

              <!-- Parse errors -->
              <div v-if="report.errors.length > 0" class="ext:p-3 ext:bg-yellow-50 ext:rounded ext:border ext:border-yellow-200">
                <p class="ext:text-sm ext:font-medium ext:text-yellow-800 ext:mb-1">{{ t('Parse warnings') }}</p>
                <ul class="ext:text-xs ext:text-yellow-700 ext:space-y-0.5">
                  <li v-for="(err, i) in report.errors" :key="i">{{ err }}</li>
                </ul>
              </div>

              <!-- Details toggle -->
              <button
                v-if="report.results.length > 0"
                type="button"
                class="ext:text-sm ext:text-blue-600 hover:ext:underline"
                @click="showDetails = !showDetails"
              >
                {{ showDetails ? t('Hide details') : t('Show details') }}
              </button>

              <!-- Detailed results -->
              <div v-if="showDetails" class="ext:max-h-48 ext:overflow-y-auto ext:border ext:border-gray-200 ext:rounded">
                <table class="ext:w-full ext:text-xs">
                  <tbody>
                    <tr
                      v-for="(result, i) in report.results"
                      :key="i"
                      class="ext:border-b ext:border-gray-100"
                    >
                      <td class="ext:px-2 ext:py-1">
                        <span
                          class="ext:inline-block ext:px-1.5 ext:py-0.5 ext:rounded ext:text-white ext:text-[10px] ext:font-medium"
                          :class="{
                            'ext:bg-green-600': result.type === 'created',
                            'ext:bg-blue-600': result.type === 'updated',
                            'ext:bg-gray-500': result.type === 'skipped',
                            'ext:bg-red-600': result.type === 'failed'
                          }"
                        >
                          {{ result.type }}
                        </span>
                      </td>
                      <td class="ext:px-2 ext:py-1 ext:text-gray-900 ext:truncate ext:max-w-[200px]">
                        {{ result.summary }}
                      </td>
                      <td v-if="'reason' in result || 'error' in result" class="ext:px-2 ext:py-1 ext:text-gray-500">
                        {{ 'reason' in result ? result.reason : '' }}
                        {{ 'error' in result ? result.error : '' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="ext:flex ext:items-center ext:justify-end ext:gap-3 ext:px-6 ext:py-4 ext:border-t ext:bg-gray-50 ext:shrink-0">
          <template v-if="phase === 'idle' || phase === 'error'">
            <button
              type="button"
              class="ext:px-4 ext:py-2 ext:text-sm ext:text-gray-700 ext:bg-gray-200 ext:rounded hover:ext:bg-gray-300"
              @click="handleClose"
            >
              {{ t('Cancel') }}
            </button>
            <button
              type="button"
              class="ext:px-4 ext:py-2 ext:text-sm ext:text-white ext:bg-blue-600 ext:rounded hover:ext:bg-blue-700 disabled:ext:opacity-50"
              :disabled="!canImport"
              @click="handleImport"
            >
              {{ t('Import') }}
            </button>
          </template>

          <template v-else-if="phase === 'done'">
            <button
              type="button"
              class="ext:px-4 ext:py-2 ext:text-sm ext:text-gray-700 ext:bg-gray-200 ext:rounded hover:ext:bg-gray-300"
              @click="handleClose"
            >
              {{ t('Close') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
