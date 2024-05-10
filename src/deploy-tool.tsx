import { definePlugin } from 'sanity'
import { route } from 'sanity/router'

import { default as deployIcon } from './deploy-icon'
import type { PagesDeployConfig } from './types'
import PagesDeploy from './vercel-deploy'

export const pagesDeployTool = definePlugin<PagesDeployConfig | void>(
  (options) => {
    const { name, title, icon, ...config } = options || {}

    return {
      name: 'sanity-plugin-cloudflare-pages-deploy',
      tools: [
        {
          name: name || 'cloudflare-pages-deploy',
          title: title || 'Deploy',
          icon: icon || deployIcon,
          component: PagesDeploy,
          options: config,
          router: route.create('/*'),
        },
      ],
    }
  }
)
