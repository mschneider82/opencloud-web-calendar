<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@opencloud-eu/web-pkg'
import CalendarToolbar from '../components/CalendarToolbar.vue'
import CalendarSidebar from '../components/CalendarSidebar.vue'
import CalendarView from '../components/CalendarView.vue'
import EventDialog from '../components/EventDialog.vue'
import { useCalendars } from '../composables/useCalendars'
import { useEvents } from '../composables/useEvents'
import { useEventEditor } from '../composables/useEventEditor'
import { getExtendedRange } from '../utils/date'
import { getCalDAVClient } from '../caldav/client'
import { initAuthStore } from '../caldav/auth'
import type { CalendarEvent } from '../types/calendar'

console.log('[WebCalendar] Calendar.vue script executing')

// Initialize auth store for CalDAV requests
const authStore = useAuthStore()
console.log('[WebCalendar] authStore obtained:', authStore)
console.log('[WebCalendar] authStore.accessToken:', authStore.accessToken)
initAuthStore(authStore)

const {
  calendars,
  loading: calendarsLoading,
  loadCalendars,
  toggleCalendarVisibility,
  getDefaultCalendar
} = useCalendars()

const {
  fetchEvents,
  getVisibleEvents,
  addEvent,
  updateEventInCache,
  removeEvent
} = useEvents()

const { openCreate, openEdit } = useEventEditor()

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
  </div>
</template>
