import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    basepath: '/spritz',
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}
