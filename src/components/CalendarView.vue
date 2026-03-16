<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions, EventInput, EventClickArg, DateSelectArg, EventDropArg, DatesSetArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import type { CalendarEvent, Calendar } from '../types/calendar'

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
    id: event.uid,
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
  background-color: #ffffff;
  color: #1f2937;
}

.fc-theme-standard td,
.fc-theme-standard th {
  border-color: #e5e7eb;
}

.fc-theme-standard .fc-scrollgrid {
  border-color: #e5e7eb;
}

.fc .fc-button-primary {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.fc .fc-button-primary:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.fc .fc-button-primary:disabled {
  background-color: #93c5fd;
  border-color: #93c5fd;
}

.fc-event {
  cursor: pointer;
}

.fc-daygrid-day-number {
  padding: 4px 8px;
  color: #1f2937;
}

.fc-col-header-cell-cushion {
  padding: 8px;
  color: #374151;
}

.fc-daygrid-day {
  background-color: #ffffff;
}

.fc-day-today {
  background-color: #eff6ff !important;
}

.fc-daygrid-day-top {
  color: #1f2937;
}

.fc-timegrid-slot-label {
  color: #6b7280;
}

.fc-list-day-cushion {
  background-color: #f3f4f6;
  color: #1f2937;
}
</style>
