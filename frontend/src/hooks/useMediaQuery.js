import { useState, useEffect } from 'react'

/**
 * Reactively tracks whether a CSS media query currently matches.
 * Used to switch between the desktop (fixed sidebar) and mobile
 * (slide-in drawer) layouts, and to tune spacing per breakpoint.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
