/**
 * Hook for calculating concept node styles with theme-aware defaults.
 * 
 * Provides memoized node style calculation based on metadata, theme, and selected state.
 * Watches for theme changes and recalculates styles accordingly.
 * 
 * **Style Properties:**
 * - `fillColor`: Background color (default: white/dark based on theme)
 * - `borderColor`: Border color (default: gray)
 * - `borderStyle`: Border style ('solid', 'dashed', 'dotted', 'long-dash')
 * - `borderThickness`: Border width in pixels (default: 2)
 * - `textColor`: Text color (default: black/white based on theme)
 * 
 * **Selected State:**
 * When selected, the fill color changes to a subtle highlight color:
 * - Dark mode: subtle blue-gray tint
 * - Light mode: pale yellow
 * 
 * @param metadata - Concept metadata containing style properties
 * @param selected - Whether the node is currently selected
 * @returns Memoized node style object
 * 
 * @example
 * ```tsx
 * import { useConceptNodeStyle } from '@/hooks/useConceptNodeStyle'
 * 
 * function ConceptNode({ concept, selected }) {
 *   const nodeStyle = useConceptNodeStyle(concept.metadata, selected)
 *   
 *   return (
 *     <div style={{ backgroundColor: nodeStyle.fillColor }}>
 *       {concept.label}
 *     </div>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useMemo } from 'react'
import { calculateNodeStyle, type NodeStyle } from '@/lib/nodeStyleUtils'

/**
 * Hook to calculate node style with theme-aware defaults.
 * 
 * Watches for theme changes and recalculates styles when metadata or theme changes.
 * 
 * @param metadata - Concept metadata containing style properties
 * @param selected - Whether the node is currently selected
 * @returns Memoized node style object
 */
export function useConceptNodeStyle(
  metadata: Record<string, unknown>,
  selected: boolean
): NodeStyle {
  // Track dark mode state for theme-aware defaults
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  )
  
  useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])
  
  // Memoize style calculation based on metadata, selected state, and theme
  // Note: We use metadata directly as a dependency. If metadata object reference changes,
  // the style will recalculate. This is acceptable as metadata changes should trigger
  // style updates anyway.
  const nodeStyle = useMemo(() => {
    return calculateNodeStyle(metadata || {}, isDarkMode, selected)
  }, [metadata, selected, isDarkMode])
  
  return nodeStyle
}

