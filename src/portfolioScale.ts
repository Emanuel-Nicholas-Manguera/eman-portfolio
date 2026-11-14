// Convert viewport measurements back to CSS lengths inside the scaled portfolio.
export function portfolioScale(element: HTMLElement) {
  const content = element.closest('.portfolio-content')
  return content ? Number(getComputedStyle(content).zoom) || 1 : 1
}
