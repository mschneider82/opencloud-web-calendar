# Calendar for OpenCloud

A CalDAV calendar application integrated as a native [OpenCloud](https://opencloud.eu/) web extension. View, create, edit and manage calendar events directly within OpenCloud.

![Screenshot](screenshot.png)

## Features

- CalDAV integration with OpenCloud backend
- Month, week and day views
- Create, edit and delete calendar events
- Drag & drop event rescheduling
- Multiple calendar support with color coding
- All-day and timed events
- Event conflict detection and resolution
- Auto-save with optimistic updates
- Multi-language support (English, German) with automatic detection from user profile

## Installation

### 1. Copy the Extension Files

Download the latest release archive from the [Releases](https://github.com/mschneider82/opencloud-web-calendar/releases) page and extract it into your OpenCloud web assets directory:

```bash
unzip web-app-calendar.zip -d /var/lib/opencloud/web/assets/apps/web-calendar/
```

### 2. Register the Extension

Add the extension to your OpenCloud `config.json`:

```json
{
  "external_apps": [
    {
      "id": "web-calendar",
      "path": "web/assets/apps/web-calendar/js/web-calendar.js"
    }
  ]
}
```

### 3. Configure Content Security Policy (CSP)

Add `https://esm.sh/` to your CSP configuration to allow loading of required dependencies:

```yaml
# csp.yaml
directives:
  font-src:
    - "'self'"
    - "data:"
    - "https://esm.sh/"
```

### 4. Configure CalDAV Backend Proxy

The calendar requires a CalDAV backend (e.g., Radicale). Configure your OpenCloud proxy to route CalDAV requests:

```yaml
# proxy.yaml
additional_policies:
  - name: default
    routes:
      - endpoint: /caldav/
        backend: http://your-caldav-server:5232
        remote_user_header: X-Remote-User
        skip_x_access_token: true
        additional_headers:
          - X-Script-Name: /caldav
      - endpoint: /.well-known/caldav
        backend: http://your-caldav-server:5232
        remote_user_header: X-Remote-User
        skip_x_access_token: true
        additional_headers:
          - X-Script-Name: /caldav
```

### 5. Restart OpenCloud

Restart OpenCloud to pick up the new extension and configuration.

## Kubernetes / Helm Deployment

For Kubernetes deployments using the OpenCloud Helm chart, you need to configure the following:

### 1. Add Extension to config.json ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opencloud-opencloud-config-json
  namespace: opencloud
data:
  config.json: |
    {
      "server": "https://your-opencloud-instance.com",
      "external_apps": [
        {
          "id": "web-calendar",
          "path": "web/assets/apps/web-calendar/js/web-calendar.js"
        }
      ]
    }
```

### 2. Configure CSP in Helm Values

```yaml
# values.yaml or ConfigMap
csp:
  directives:
    font-src:
      - "'self'"
      - "data:"
      - "https://esm.sh/"
```

### 3. Configure CalDAV Proxy Routes

```yaml
# proxy.yaml ConfigMap
additional_policies:
  - name: default
    routes:
      - endpoint: /caldav/
        backend: http://opencloud-radicale:5232
        remote_user_header: X-Remote-User
        skip_x_access_token: true
        additional_headers:
          - X-Script-Name: /caldav
      - endpoint: /.well-known/caldav
        backend: http://opencloud-radicale:5232
        remote_user_header: X-Remote-User
        skip_x_access_token: true
        additional_headers:
          - X-Script-Name: /caldav
```

### 4. Copy Extension Files

Use an init container or ConfigMap to copy the extension files to `/var/lib/opencloud/web/assets/apps/web-calendar/`.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/installation) (see `packageManager` field in `package.json` for the exact version)
- Docker and Docker Compose (for local dev server)

### Setup

```bash
pnpm install
pnpm build:w
```

### Local Development Server

```bash
docker compose up
```

Then open `https://host.docker.internal:9200` (default credentials: `admin`/`admin`).

### Build for Production

```bash
pnpm build
```

The production build is output to the `dist/` directory.

### Testing

```bash
pnpm test:unit
```

## Architecture

The application is built with:

- **Vue 3** with Composition API
- **FullCalendar** for calendar rendering
- **CalDAV** protocol for calendar synchronization
- **ical.js** for iCalendar parsing and generation
- **Tailwind CSS** for styling

### Key Components

- `CalendarView.vue` - Main calendar component using FullCalendar
- `CalendarToolbar.vue` - Navigation and view switching controls
- `CalendarSidebar.vue` - Calendar list with visibility toggles
- `EventDialog.vue` - Event creation and editing modal

### Composables

- `useCalendars` - Calendar list management
- `useEvents` - Event fetching and caching
- `useEventEditor` - Event creation/editing state machine

### CalDAV Integration

The CalDAV client (`src/caldav/client.ts`) handles:
- Calendar discovery via PROPFIND
- Event fetching via REPORT
- Event creation, updates and deletion via PUT/DELETE
- ETag-based conflict detection

## License

[Apache-2.0](LICENSE)
