<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@opencloud-eu/web-pkg'
import CalendarToolbar from '../components/CalendarToolbar.vue'
import CalendarSidebar from '../components/CalendarSidebar.vue'
import CalendarView from '../components/CalendarView.vue'
import EventDialog from '../components/EventDialog.vue'
import CalendarDialog from '../components/CalendarDialog.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ICSImportDialog from '../components/ICSImportDialog.vue'
import { useCalendars } from '../composables/useCalendars'
import { useEvents } from '../composables/useEvents'
import { useEventEditor } from '../composables/useEventEditor'
import { useCalendarEditor } from '../composables/useCalendarEditor'
import { useTheme } from '../composables/useTheme'
import { getExtendedRange } from '../utils/date'
import { getCalDAVClient } from '../caldav/client'
import { initAuthStore } from '../caldav/auth'
import { initLanguage, t } from '../composables/useLanguage'
import type { CalendarEvent } from '../types/calendar'

console.log('[WebCalendar] Calendar.vue script executing')

// Initialize auth store for CalDAV requests
const authStore = useAuthStore()
console.log('[WebCalendar] authStore obtained:', authStore)
console.log('[WebCalendar] authStore.accessToken:', authStore.accessToken)
initAuthStore(authStore)

// Initialize language from user profile
initLanguage()

const {
  calendars,
  loading: calendarsLoading,
  calendarHomeUrl,
  loadCalendars,
  toggleCalendarVisibility,
  getDefaultCalendar,
  deleteCalendar
} = useCalendars()

const {
  fetchEvents,
  getVisibleEvents,
  addEvent,
  updateEventInCache,
  removeEvent
} = useEvents()

const { openCreate, openEdit } = useEventEditor()
const { open: openCalendarEditor } = useCalendarEditor()
const importDialogRef = ref<InstanceType<typeof ICSImportDialog> | null>(null)
const { isDark } = useTheme()

// Confirmation dialog state
const confirmDelete = ref<{
  isOpen: boolean
  calendarHref: string
  calendarName: string
} | null>(null)

const calendarViewRef = ref<InstanceType<typeof CalendarView> | null>(null)
const currentDate = ref(new Date())
const viewType = ref<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth')

const visibleEvents = computed(() => getVisibleEvents(calendars.value as any))

onMounted(async () => {
  await loadCalendars()
  await loadEventsForCurrentRange()
})

watch(
  () => calendars.value.map((c) => c.visible).join(','),
  () => {
    // Visibility changed, events will be filtered by visibleEvents computed
  }
)

async function loadEventsForCurrentRange() {
  const range = getExtendedRange(currentDate.value)
  await fetchEvents(calendars.value as any, range)
}

function handlePrev() {
  calendarViewRef.value?.prev()
}

function handleNext() {
  calendarViewRef.value?.next()
}

function handleToday() {
  calendarViewRef.value?.today()
  currentDate.value = new Date()
}

function handleViewChange(view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') {
  viewType.value = view
}

function handleDateChange(date: Date) {
  currentDate.value = date
  loadEventsForCurrentRange()
}

function handleToggleCalendar(href: string) {
  toggleCalendarVisibility(href)
}

function handleEventClick(event: CalendarEvent) {
  openEdit(event)
}

function handleDateSelect(start: Date, end: Date, allDay: boolean) {
  const defaultCalendar = getDefaultCalendar()
  if (defaultCalendar) {
    openCreate(defaultCalendar.href, start, end, allDay)
  }
}

async function handleEventDrop(event: CalendarEvent, start: Date, end: Date) {
  const client = getCalDAVClient()
  try {
    if (event.isRecurring && event.recurrenceId) {
      // Drag-drop a recurring instance: create exception for this occurrence
      await client.updateEventOccurrence(event, event.recurrenceId, {
        uid: event.uid,
        calendarHref: event.calendarHref,
        summary: event.summary,
        start,
        end,
        allDay: event.allDay,
        description: event.description || '',
        location: event.location || ''
      })
      await loadEventsForCurrentRange()
    } else {
      const updated = await client.updateEvent(event, {
        uid: event.uid,
        calendarHref: event.calendarHref,
        summary: event.summary,
        start,
        end,
        allDay: event.allDay,
        description: event.description || '',
        location: event.location || ''
      })
      updateEventInCache(updated)
    }
  } catch (err) {
    console.error('Failed to update event:', err)
    await loadEventsForCurrentRange()
  }
}

async function handleEventSaved() {
  await loadEventsForCurrentRange()
}

async function handleEventDeleted() {
  await loadEventsForCurrentRange()
}

function handleCreateCalendar() {
  openCalendarEditor()
}

function handleDeleteCalendar(calendarHref: string) {
  const calendar = calendars.value.find((c) => c.href === calendarHref)
  if (calendar) {
    confirmDelete.value = {
      isOpen: true,
      calendarHref,
      calendarName: calendar.displayName
    }
  }
}

async function confirmCalendarDeletion() {
  if (!confirmDelete.value) return

  const success = await deleteCalendar(confirmDelete.value.calendarHref)
  if (success) {
    // Reload events to remove events from deleted calendar
    await loadEventsForCurrentRange()
  }
  confirmDelete.value = null
}

function cancelCalendarDeletion() {
  confirmDelete.value = null
}

async function handleCalendarSaved() {
  await loadCalendars()
}

function handleImportCalendar() {
  importDialogRef.value?.open()
}

async function handleImported() {
  await loadCalendars()
  await loadEventsForCurrentRange()
}
</script>

<template>
  <div class="ext:flex ext:flex-col ext:h-full ext:bg-white">
    <CalendarToolbar
      :current-date="currentDate"
      :view-type="viewType"
      @prev="handlePrev"
      @next="handleNext"
      @today="handleToday"
      @change-view="handleViewChange"
    />

    <div class="ext:flex ext:flex-1 ext:overflow-hidden">
      <CalendarSidebar
        :calendars="calendars"
        :loading="calendarsLoading"
        @toggle="handleToggleCalendar"
        @create="handleCreateCalendar"
        @delete="handleDeleteCalendar"
        @import="handleImportCalendar"
      />

      <CalendarView
        ref="calendarViewRef"
        :events="visibleEvents"
        :calendars="calendars"
        :current-date="currentDate"
        :view-type="viewType"
        @date-change="handleDateChange"
        @event-click="handleEventClick"
        @date-select="handleDateSelect"
        @event-drop="handleEventDrop"
      />
    </div>

    <EventDialog
      :calendars="calendars"
      @saved="handleEventSaved"
      @deleted="handleEventDeleted"
    />

    <CalendarDialog :calendar-home-url="calendarHomeUrl" @saved="handleCalendarSaved" />

    <ICSImportDialog
      ref="importDialogRef"
      :calendars="calendars"
      :calendar-home-url="calendarHomeUrl"
      :default-calendar="getDefaultCalendar() || null"
      @imported="handleImported"
    />

    <ConfirmDialog
      :is-open="confirmDelete?.isOpen || false"
      :title="t('Delete Calendar')"
      :message="t(`Are you sure you want to delete '%{name}'? All events in this calendar will be permanently deleted.`, { name: confirmDelete?.calendarName || '' })"
      :confirm-text="t('Delete')"
      :confirm-danger="true"
      @confirm="confirmCalendarDeletion"
      @cancel="cancelCalendarDeletion"
    />
  </div>
</template>

<style>
/* ============================================================
   Dark mode overrides
   Uses OpenCloud's --oc-role-* CSS variables that are set on
   document.documentElement and switch automatically with theme.
   ============================================================ */

/* --- Backgrounds --- */
[data-calendar-theme="dark"] .ext\:bg-white {
  background-color: var(--oc-role-surface) !important;
}
[data-calendar-theme="dark"] .ext\:bg-gray-50 {
  background-color: var(--oc-role-surface-container) !important;
}
[data-calendar-theme="dark"] .ext\:bg-gray-100 {
  background-color: var(--oc-role-surface-container-high) !important;
}
[data-calendar-theme="dark"] .ext\:bg-gray-200 {
  background-color: var(--oc-role-surface-container-high) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:bg-gray-50:hover {
  background-color: var(--oc-role-surface-container-high) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:bg-gray-100:hover {
  background-color: var(--oc-role-surface-container-highest) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:bg-gray-200:hover {
  background-color: var(--oc-role-surface-container-highest) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:bg-gray-300:hover {
  background-color: var(--oc-role-surface-container-highest) !important;
}

/* --- Text colors --- */
[data-calendar-theme="dark"] .ext\:text-gray-900 {
  color: var(--oc-role-on-surface) !important;
}
[data-calendar-theme="dark"] .ext\:text-gray-700 {
  color: var(--oc-role-on-surface-variant) !important;
}
[data-calendar-theme="dark"] .ext\:text-gray-600 {
  color: var(--oc-role-outline) !important;
}
[data-calendar-theme="dark"] .ext\:text-gray-500 {
  color: var(--oc-role-outline) !important;
}
[data-calendar-theme="dark"] .ext\:text-gray-400 {
  color: var(--oc-role-outline) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:text-gray-700:hover {
  color: var(--oc-role-on-surface) !important;
}

/* --- Borders --- */
[data-calendar-theme="dark"] .ext\:border-gray-200 {
  border-color: var(--oc-role-outline-variant) !important;
}
[data-calendar-theme="dark"] .ext\:border-gray-300 {
  border-color: var(--oc-role-outline-variant) !important;
}
[data-calendar-theme="dark"] .ext\:border-gray-900 {
  border-color: var(--oc-role-on-surface) !important;
}
[data-calendar-theme="dark"] .ext\:border-b {
  border-color: var(--oc-role-outline-variant);
}
[data-calendar-theme="dark"] .ext\:border-t {
  border-color: var(--oc-role-outline-variant);
}
[data-calendar-theme="dark"] .ext\:border-r {
  border-color: var(--oc-role-outline-variant);
}

/* --- Primary / Blue --- */
[data-calendar-theme="dark"] .ext\:bg-blue-500 {
  background-color: var(--oc-role-primary) !important;
}
[data-calendar-theme="dark"] .ext\:bg-blue-600 {
  background-color: var(--oc-role-primary) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:bg-blue-700:hover {
  background-color: var(--oc-role-primary-container) !important;
  color: var(--oc-role-on-primary-container) !important;
}
[data-calendar-theme="dark"] .ext\:text-blue-600 {
  color: var(--oc-role-primary) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:bg-blue-50:hover {
  background-color: var(--oc-role-primary-container) !important;
}
[data-calendar-theme="dark"] .ext\:border-blue-200 {
  border-color: var(--oc-role-primary-container) !important;
}
[data-calendar-theme="dark"] .ext\:border-blue-600 {
  border-color: var(--oc-role-primary) !important;
}
[data-calendar-theme="dark"] .ext\:bg-blue-600.ext\:text-white {
  background-color: var(--oc-role-primary) !important;
  color: var(--oc-role-on-primary) !important;
}

/* --- Focus rings --- */
[data-calendar-theme="dark"] .ext\:focus\:ring-blue-500:focus {
  --tw-ring-color: var(--oc-role-primary) !important;
}
[data-calendar-theme="dark"] .ext\:focus\:border-blue-500:focus {
  border-color: var(--oc-role-primary) !important;
}

/* --- Error / Red --- */
[data-calendar-theme="dark"] .ext\:text-red-600 {
  color: var(--oc-role-error) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:text-red-600:hover {
  color: var(--oc-role-error) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:text-red-800:hover {
  color: var(--oc-role-error) !important;
}
[data-calendar-theme="dark"] .ext\:bg-red-600 {
  background-color: var(--oc-role-error-container) !important;
  color: var(--oc-role-on-error-container) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:bg-red-700:hover {
  background-color: var(--oc-role-error) !important;
}

/* --- Warning / Yellow (conflict resolution) --- */
[data-calendar-theme="dark"] .ext\:bg-yellow-50 {
  background-color: var(--oc-role-surface-container-high) !important;
}
[data-calendar-theme="dark"] .ext\:border-yellow-200 {
  border-color: var(--oc-role-outline-variant) !important;
}
[data-calendar-theme="dark"] .ext\:text-yellow-800 {
  color: var(--oc-role-on-surface) !important;
}
[data-calendar-theme="dark"] .ext\:bg-yellow-600 {
  background-color: var(--oc-role-primary) !important;
}
[data-calendar-theme="dark"] .hover\:ext\:bg-yellow-700:hover {
  background-color: var(--oc-role-primary-container) !important;
}

/* --- Inputs (inside dark theme) --- */
[data-calendar-theme="dark"] input,
[data-calendar-theme="dark"] select,
[data-calendar-theme="dark"] textarea {
  background-color: var(--oc-role-surface-container-low) !important;
  color: var(--oc-role-on-surface) !important;
  border-color: var(--oc-role-outline-variant) !important;
}
[data-calendar-theme="dark"] input[type="checkbox"],
[data-calendar-theme="dark"] input[type="radio"] {
  background-color: var(--oc-role-surface-container-low) !important;
  accent-color: var(--oc-role-primary) !important;
}
[data-calendar-theme="dark"] input::placeholder,
[data-calendar-theme="dark"] textarea::placeholder {
  color: var(--oc-role-outline) !important;
}
[data-calendar-theme="dark"] option {
  background-color: var(--oc-role-surface-container) !important;
  color: var(--oc-role-on-surface) !important;
}

/* --- Dialog shadows --- */
[data-calendar-theme="dark"] .ext\:shadow-xl {
  --tw-shadow-color: rgba(0, 0, 0, 0.5) !important;
}
</style>
