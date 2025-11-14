/**
 * Utility functions for node style calculation and metadata filtering.
 * 
 * Provides functions to calculate theme-aware node styles and filter style
 * attributes from metadata.
 */

/**
 * Style attribute keys that should be treated as built-in attributes, not metadata
 */
export const NODE_STYLE_ATTRIBUTES = ['fillColor', 'borderColor', 'borderStyle', 'textColor'] as const

/**
 * Node style properties calculated from metadata and theme
 */
export interface NodeStyle {
  fillColor: string
  borderColor: string
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'long-dash'
  borderThickness: number
  textColor: string
}

/**
 * Filter out style attributes from metadata.
 * 
 * Style attributes (fillColor, borderColor, etc.) are stored in metadata but
 * should be excluded when displaying metadata to avoid duplication.
 * 
 * @param metadata - Metadata object to filter
 * @returns Filtered metadata without style attributes
 * 
 * @example
 * ```ts
 * const metadata = { fillColor: '#fff', category: 'important', borderColor: '#000' }
 * const filtered = getNonStyleMetadata(metadata)
 * // Returns: { category: 'important' }
 * ```
 */
export function getNonStyleMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {}
  Object.entries(metadata).forEach(([key, value]) => {
    if (!NODE_STYLE_ATTRIBUTES.includes(key as typeof NODE_STYLE_ATTRIBUTES[number])) {
      filtered[key] = value
    }
  })
  return filtered
}

/**
 * Calculate node style from metadata with theme-aware defaults.
 * 
 * Computes the visual style for a concept node based on metadata and theme.
 * Provides sensible defaults for light/dark mode and handles selected state.
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
 * @param isDarkMode - Whether dark mode is active
 * @param selected - Whether the node is currently selected
 * @returns Calculated node style object
 * 
 * @example
 * ```ts
 * const metadata = { fillColor: '#ff0000', borderColor: '#0000ff' }
 * const style = calculateNodeStyle(metadata, false, false)
 * // Returns: { fillColor: '#ff0000', borderColor: '#0000ff', ... }
 * ```
 */
export function calculateNodeStyle(
  metadata: Record<string, unknown>,
  isDarkMode: boolean,
  selected: boolean
): NodeStyle {
  // Theme-aware default colors
  const defaultFillColor = isDarkMode ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)'
  const defaultBorderColor = isDarkMode ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)'
  const defaultTextColor = isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)'
  const defaultPrimaryColor = isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)'
  
  // Selected state colors - subtle but noticeable
  // Dark mode: subtle blue-gray tint that works well with dark backgrounds
  // Light mode: pale yellow for visibility
  const selectedFillColor = isDarkMode ? 'hsl(217 32% 25%)' : 'hsl(54 96% 88%)'
  
  // Validate borderStyle - only allow valid values
  const validBorderStyles: Array<'solid' | 'dashed' | 'dotted' | 'long-dash'> = ['solid', 'dashed', 'dotted', 'long-dash']
  const borderStyle = metadata.borderStyle as 'solid' | 'dashed' | 'dotted' | 'long-dash'
  const validatedBorderStyle = validBorderStyles.includes(borderStyle) ? borderStyle : 'solid'
  
  // Handle borderThickness - check for number type and handle zero
  const borderThicknessValue = metadata.borderThickness
  const borderThickness = typeof borderThicknessValue === 'number' ? borderThicknessValue : 2
  
  return {
    fillColor: selected ? selectedFillColor : ((metadata.fillColor as string) || defaultFillColor),
    borderColor: selected ? defaultPrimaryColor : ((metadata.borderColor as string) || defaultBorderColor),
    borderStyle: validatedBorderStyle,
    borderThickness,
    textColor: (metadata.textColor as string) || defaultTextColor,
  }
}

