import { useEffect } from 'react'
import { Outlet, createRootRoute, useRouter } from '@tanstack/react-router'
import { ThemeProvider } from '../lib/theme'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const router = useRouter()

  useEffect(() => {
    const redirect = sessionStorage.getItem('spa-redirect')
    if (redirect) {
      sessionStorage.removeItem('spa-redirect')
      router.navigate({ to: redirect })
    }
  }, [router])

  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  )
}
