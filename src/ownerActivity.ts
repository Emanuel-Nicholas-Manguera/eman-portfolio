const ownerActivityKey = 'portfolio-owner-analytics-excluded'

export function excludeOwnerActivity() {
  try {
    window.localStorage.setItem(ownerActivityKey, '1')
  } catch {
    // Browser storage can be disabled. It must never block admin sign-in.
  }
}

export function isOwnerActivityExcluded() {
  try {
    return window.localStorage.getItem(ownerActivityKey) === '1'
  } catch {
    return false
  }
}
