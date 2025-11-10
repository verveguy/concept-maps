/**
 * Hook for tracking component renders and effect executions.
 * Useful for debugging infinite loops and performance issues.
 */

import { useEffect, useRef } from 'react'

/**
 * Options for useRenderTracker hook.
 */
interface RenderTrackerOptions {
  /** Component name for logging */
  name: string
  /** Whether to log renders to console */
  logRenders?: boolean
  /** Maximum number of renders before warning */
  maxRenders?: number
  /** Callback when max renders exceeded */
  onMaxRendersExceeded?: () => void
}

/**
 * Hook for tracking component renders and effect executions.
 * 
 * Helps identify infinite loops by tracking render counts and
 * logging when renders exceed a threshold.
 * 
 * @param options - Tracker options
 * @param options.name - Component name
 * @param options.logRenders - Whether to log each render
 * @param options.maxRenders - Maximum renders before warning (default: 50)
 * @param options.onMaxRendersExceeded - Callback when threshold exceeded
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderTracker({ name: 'MyComponent', maxRenders: 20 })
 *   // ... component code
 * }
 * ```
 */
export function useRenderTracker({
  name,
  logRenders = false,
  maxRenders = 50,
  onMaxRendersExceeded,
}: RenderTrackerOptions) {
  const renderCountRef = useRef(0)
  const effectCountRef = useRef(0)
  const lastRenderTimeRef = useRef(Date.now())

  // Track render count
  renderCountRef.current += 1
  const renderCount = renderCountRef.current
  const now = Date.now()
  const timeSinceLastRender = now - lastRenderTimeRef.current
  lastRenderTimeRef.current = now

  // Check for rapid renders (potential infinite loop)
  if (timeSinceLastRender < 16 && renderCount > 10) {
    console.warn(
      `[${name}] Rapid renders detected: ${renderCount} renders, ` +
      `last render ${timeSinceLastRender}ms ago`
    )
  }

  // Check if max renders exceeded
  if (renderCount > maxRenders) {
    console.error(
      `[${name}] Maximum render count exceeded: ${renderCount} renders. ` +
      `This may indicate an infinite loop.`
    )
    if (onMaxRendersExceeded) {
      onMaxRendersExceeded()
    }
  }

  // Log renders if enabled
  if (logRenders) {
    console.log(`[${name}] Render #${renderCount}`, {
      timeSinceLastRender,
      effectsRun: effectCountRef.current,
    })
  }

  // Track effect executions
  useEffect(() => {
    effectCountRef.current += 1
    if (logRenders) {
      console.log(`[${name}] Effect #${effectCountRef.current} executed`)
    }
  })

  return {
    renderCount,
    effectCount: effectCountRef.current,
  }
}
