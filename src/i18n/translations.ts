// Translations for the calendar application
// Supported languages: English (en), German (de)

export const translations = {
  en: {
    // App
    'Web Calendar': 'Web Calendar',

    // Navigation
    Today: 'Today',
    Month: 'Month',
    Week: 'Week',
    Day: 'Day',

    // Sidebar
    Calendars: 'Calendars',
    'Create new calendar': 'Create new calendar',
    'Loading calendars...': 'Loading calendars...',
    'No calendars found': 'No calendars found',
    'Delete calendar': 'Delete calendar',

    // Event Dialog
    'Edit Event': 'Edit Event',
    'New Event': 'New Event',
    Title: 'Title',
    Calendar: 'Calendar',
    'All day event': 'All day event',
    'Start Date': 'Start Date',
    'Start Time': 'Start Time',
    'End Date': 'End Date',
    'End Time': 'End Time',
    Location: 'Location',
    Description: 'Description',
    'Event title': 'Event title',
    'Add location': 'Add location',
    'Add description': 'Add description',
    Delete: 'Delete',
    Cancel: 'Cancel',
    'Saving...': 'Saving...',
    Save: 'Save',

    // Conflict Resolution
    'This event was modified by another client. Choose how to resolve:':
      'This event was modified by another client. Choose how to resolve:',
    'Keep my changes': 'Keep my changes',
    'Use server version': 'Use server version',

    // Calendar Dialog
    'New Calendar': 'New Calendar',
    'Calendar Name': 'Calendar Name',
    'Description (optional)': 'Description (optional)',
    Color: 'Color',
    'Calendar description': 'Calendar description',
    'My Calendar': 'My Calendar',
    'Creating...': 'Creating...',
    Create: 'Create',

    // Confirm Dialog
    Confirm: 'Confirm',

    // Delete Calendar Confirmation
    'Delete Calendar': 'Delete Calendar',
    "Are you sure you want to delete '%{name}'? All events in this calendar will be permanently deleted.":
      "Are you sure you want to delete '%{name}'? All events in this calendar will be permanently deleted."
  },
  de: {
    // App
    'Web Calendar': 'Web-Kalender',

    // Navigation
    Today: 'Heute',
    Month: 'Monat',
    Week: 'Woche',
    Day: 'Tag',

    // Sidebar
    Calendars: 'Kalender',
    'Create new calendar': 'Neuen Kalender erstellen',
    'Loading calendars...': 'Kalender werden geladen...',
    'No calendars found': 'Keine Kalender gefunden',
    'Delete calendar': 'Kalender löschen',

    // Event Dialog
    'Edit Event': 'Termin bearbeiten',
    'New Event': 'Neuer Termin',
    Title: 'Titel',
    Calendar: 'Kalender',
    'All day event': 'Ganztägig',
    'Start Date': 'Startdatum',
    'Start Time': 'Startzeit',
    'End Date': 'Enddatum',
    'End Time': 'Endzeit',
    Location: 'Ort',
    Description: 'Beschreibung',
    'Event title': 'Terminname',
    'Add location': 'Ort hinzufügen',
    'Add description': 'Beschreibung hinzufügen',
    Delete: 'Löschen',
    Cancel: 'Abbrechen',
    'Saving...': 'Speichern...',
    Save: 'Speichern',

    // Conflict Resolution
    'This event was modified by another client. Choose how to resolve:':
      'Dieser Termin wurde von einem anderen Client geändert. Wie möchten Sie fortfahren?',
    'Keep my changes': 'Meine Änderungen behalten',
    'Use server version': 'Server-Version verwenden',

    // Calendar Dialog
    'New Calendar': 'Neuer Kalender',
    'Calendar Name': 'Kalendername',
    'Description (optional)': 'Beschreibung (optional)',
    Color: 'Farbe',
    'Calendar description': 'Kalenderbeschreibung',
    'My Calendar': 'Mein Kalender',
    'Creating...': 'Erstellen...',
    Create: 'Erstellen',

    // Confirm Dialog
    Confirm: 'Bestätigen',

    // Delete Calendar Confirmation
    'Delete Calendar': 'Kalender löschen',
    "Are you sure you want to delete '%{name}'? All events in this calendar will be permanently deleted.":
      "Möchten Sie '%{name}' wirklich löschen? Alle Termine in diesem Kalender werden unwiderruflich gelöscht."
  }
}

export type SupportedLanguage = 'en' | 'de'
export const supportedLanguages: SupportedLanguage[] = ['en', 'de']
export const defaultLanguage: SupportedLanguage = 'en'
