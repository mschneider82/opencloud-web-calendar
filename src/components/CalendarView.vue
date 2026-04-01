<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions, EventInput, EventClickArg, DateSelectArg, EventDropArg, DatesSetArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import type { CalendarEvent, Calendar } from '../types/calendar'
import { getFullCalendarLocale } from '../composables/useLanguage'

const props = defineProps<{
  events: CalendarEvent[]
  calendars: readonly Calendar[]
  currentDate: Date
  viewType: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'
}>()

const emit = defineEmits<{
  'date-change': [date: Date]
  'view-change': [view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay']
  'event-click': [event: CalendarEvent]
  'date-select': [start: Date, end: Date, allDay: boolean]
  'event-drop': [event: CalendarEvent, start: Date, end: Date]
}>()

const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
const lastEmittedDate = ref<number>(0)

const calendarColorMap = computed(() => {
  const map = new Map<string, string>()
  for (const cal of props.calendars) {
    map.set(cal.href, cal.color)
  }
  return map
})

const fullCalendarEvents = computed<EventInput[]>(() => {
  return props.events.map((event) => ({
    id: event.recurrenceId ? `${event.uid}_${event.recurrenceId}` : event.uid,
    title: event.summary,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: calendarColorMap.value.get(event.calendarHref) || '#3788d8',
    borderColor: calendarColorMap.value.get(event.calendarHref) || '#3788d8',
    extendedProps: {
      calendarEvent: event
    }
  }))
})

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: props.viewType,
  initialDate: props.currentDate,
  headerToolbar: false,
  locale: getFullCalendarLocale(),
  events: fullCalendarEvents.value,
  editable: true,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: true,
  weekends: true,
  nowIndicator: true,
  eventClick: handleEventClick,
  select: handleDateSelect,
  eventDrop: handleEventDrop,
  eventResize: handleEventResize,
  datesSet: handleDatesSet
}))

function handleEventClick(info: EventClickArg) {
  const calendarEvent = info.event.extendedProps.calendarEvent as CalendarEvent
  emit('event-click', calendarEvent)
}

function handleDateSelect(info: DateSelectArg) {
  emit('date-select', info.start, info.end, info.allDay)
}

function handleEventDrop(info: EventDropArg) {
  const calendarEvent = info.event.extendedProps.calendarEvent as CalendarEvent
  emit('event-drop', calendarEvent, info.event.start!, info.event.end || info.event.start!)
}

function handleEventResize(info: EventResizeDoneArg) {
  const calendarEvent = info.event.extendedProps.calendarEvent as CalendarEvent
  emit('event-drop', calendarEvent, info.event.start!, info.event.end || info.event.start!)
}

function handleDatesSet(info: DatesSetArg) {
  const dateTime = info.view.currentStart.getTime()
  if (dateTime !== lastEmittedDate.value) {
    lastEmittedDate.value = dateTime
    emit('date-change', info.view.currentStart)
  }
}

watch(
  () => props.viewType,
  (newView) => {
    const api = calendarRef.value?.getApi()
    if (api) {
      api.changeView(newView)
    }
  }
)

watch(
  () => props.currentDate,
  (newDate) => {
    const api = calendarRef.value?.getApi()
    if (api && newDate.getTime() !== lastEmittedDate.value) {
      api.gotoDate(newDate)
    }
  }
)

function goToDate(date: Date) {
  const api = calendarRef.value?.getApi()
  if (api) {
    api.gotoDate(date)
  }
}

function prev() {
  const api = calendarRef.value?.getApi()
  if (api) {
    api.prev()
  }
}

function next() {
  const api = calendarRef.value?.getApi()
  if (api) {
    api.next()
  }
}

function today() {
  const api = calendarRef.value?.getApi()
  if (api) {
    api.today()
  }
}

defineExpose({
  goToDate,
  prev,
  next,
  today
})
</script>

<template>
  <div class="ext:flex-1 ext:overflow-auto">
    <FullCalendar ref="calendarRef" :options="calendarOptions" class="ext:h-full" />
  </div>
</template>

<style>
.fc {
  height: 100%;
  background-color: var(--oc-role-surface, #ffffff);
  color: var(--oc-role-on-surface, #1f2937);
}

.fc-theme-standard td,
.fc-theme-standard th {
  border-color: var(--oc-role-outline-variant, #e5e7eb);
}

.fc-theme-standard .fc-scrollgrid {
  border-color: var(--oc-role-outline-variant, #e5e7eb);
}

.fc .fc-button-primary {
  background-color: var(--oc-role-primary, #3b82f6);
  border-color: var(--oc-role-primary, #3b82f6);
  color: var(--oc-role-on-primary, #ffffff);
}

.fc .fc-button-primary:hover {
  background-color: var(--oc-role-primary-container, #2563eb);
  border-color: var(--oc-role-primary-container, #2563eb);
  color: var(--oc-role-on-primary-container, #ffffff);
}

.fc .fc-button-primary:disabled {
  background-color: var(--oc-role-outline, #93c5fd);
  border-color: var(--oc-role-outline, #93c5fd);
}

.fc-event {
  cursor: pointer;
}

.fc-daygrid-day-number {
  padding: 4px 8px;
  color: var(--oc-role-on-surface, #1f2937);
}

.fc-col-header-cell-cushion {
  padding: 8px;
  color: var(--oc-role-on-surface-variant, #374151);
}

.fc-daygrid-day {
  background-color: var(--oc-role-surface, #ffffff);
}

.fc-day-today {
  background-color: var(--oc-role-primary-container, #eff6ff) !important;
}

.fc-daygrid-day-top {
  color: var(--oc-role-on-surface, #1f2937);
}

.fc-timegrid-slot-label {
  color: var(--oc-role-outline, #6b7280);
}

.fc-list-day-cushion {
  background-color: var(--oc-role-surface-container, #f3f4f6);
  color: var(--oc-role-on-surface, #1f2937);
}

/* Timegrid axis and slots */
.fc .fc-timegrid-axis {
  background-color: var(--oc-role-surface, #ffffff);
}

.fc .fc-timegrid-slot {
  border-color: var(--oc-role-outline-variant, #e5e7eb);
}

/* Column header background */
.fc .fc-col-header-cell {
  background-color: var(--oc-role-surface-container, #f9fafb);
}

/* Day grid "more" link */
.fc .fc-more-link {
  color: var(--oc-role-primary, #3b82f6);
}

/* Now indicator */
.fc .fc-timegrid-now-indicator-line {
  border-color: var(--oc-role-error, #ef4444);
}

/* Popover ("+2 more" events popup) */
.fc .fc-popover {
  background-color: var(--oc-role-surface-container, #ffffff);
  border-color: var(--oc-role-outline-variant, #e5e7eb);
}

.fc .fc-popover-header {
  background-color: var(--oc-role-surface-container-high, #f3f4f6);
  color: var(--oc-role-on-surface, #1f2937);
}
</style>
