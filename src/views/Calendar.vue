<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@opencloud-eu/web-pkg'
import CalendarToolbar from '../components/CalendarToolbar.vue'
import CalendarSidebar from '../components/CalendarSidebar.vue'
import CalendarView from '../components/CalendarView.vue'
import EventDialog from '../components/EventDialog.vue'
import CalendarDialog from '../components/CalendarDialog.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useCalendars } from '../composables/useCalendars'
import { useEvents } from '../composables/useEvents'
import { useEventEditor } from '../composables/useEventEditor'
import { useCalendarEditor } from '../composables/useCalendarEditor'
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
  } catch (err) {
    console.error('Failed to update event:', err)
    // Refresh events to restore the original position
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
