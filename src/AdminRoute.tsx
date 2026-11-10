import { lazy, Suspense } from 'react'

const AdminSignIn = lazy(() => import('./AdminSignIn').then((module) => ({ default: module.AdminSignIn })))

export function AdminRoute() {
  return <Suspense fallback={<main aria-busy="true">Loading sign-in…</main>}><AdminSignIn /></Suspense>
}
