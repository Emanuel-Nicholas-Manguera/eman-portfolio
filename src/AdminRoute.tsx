import { lazy, Suspense } from 'react'
import { AdminLoadingScreen } from './admin/AdminLoading'

const AdminSignIn = lazy(() => import('./AdminSignIn').then((module) => ({ default: module.AdminSignIn })))

export function AdminRoute() {
  return <Suspense fallback={<AdminLoadingScreen />}><AdminSignIn /></Suspense>
}
