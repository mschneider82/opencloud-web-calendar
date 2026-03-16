import {
  defineWebApplication,
  ApplicationSetupOptions,
  Extension,
  AppMenuItemExtension
} from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import '@opencloud-eu/extension-sdk/tailwind.css'
import { RouteRecordRaw } from 'vue-router'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

export default defineWebApplication({
  setup(args) {
    console.log('[WebCalendar] App setup called')
    const { $gettext } = useGettext()

    const appInfo = {
      id: 'web-calendar',
      name: $gettext('Web-Kalender'),
      icon: 'calendar',
      color: '#3788d8'
    }

    const routes: RouteRecordRaw[] = [
      {
        path: '/',
        name: 'web-calendar',
        component: () => {
          console.log('[WebCalendar] Loading Calendar.vue')
          return import('./views/Calendar.vue')
        },
        meta: {
          authContext: 'user',
          title: $gettext('Web-Kalender')
        }
      }
    ]

    const extensions = ({ applicationConfig }: ApplicationSetupOptions) => {
      return computed<Extension[]>(() => {
        const menuItems: AppMenuItemExtension[] = [
          {
            id: `app.${appInfo.id}.menuItem`,
            type: 'appMenuItem',
            label: () => appInfo.name,
            color: appInfo.color,
            icon: appInfo.icon,
            path: urlJoin(appInfo.id)
          }
        ]
        return [...menuItems]
      })
    }

    return {
      appInfo,
      routes,
      extensions: extensions(args)
    }
  }
})
