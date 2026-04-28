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
import { initLanguage, t } from './composables/useLanguage'

export default defineWebApplication({
  setup(args) {
    // Initialize language early
    initLanguage()

    const appInfo = {
      id: 'web-calendar',
      name: t('Web Calendar'),
      icon: 'calendar',
      color: '#3788d8'
    }

    const routes: RouteRecordRaw[] = [
      {
        path: '/',
        name: 'web-calendar',
        component: () => import('./views/Calendar.vue'),
        meta: {
          authContext: 'user',
          title: t('Web Calendar')
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
