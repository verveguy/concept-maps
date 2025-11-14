/**
 * Utility functions for calculating preview transforms for node expansion.
 * 
 * Provides functions to measure expanded content dimensions and calculate
 * CSS transforms to keep the node centered when expanding to show notes/metadata.
 */

/**
 * Parameters for measuring expanded content
 */
export interface MeasureExpandedContentParams {
  /** Current node element reference */
  nodeElement: HTMLElement
  /** Collapsed height in pixels */
  collapsedHeight: number
  /** Collapsed width in pixels */
  collapsedWidth: number
  /** Node label text */
  label: string
  /** Node notes text (markdown) */
  notes: string
  /** Whether metadata exists */
  hasMetadata: boolean
  /** Number of metadata fields */
  metadataFieldCount: number
}

/**
 * Result of measuring expanded content
 */
export interface ExpandedContentDimensions {
  /** Expanded height in pixels */
  expandedHeight: number
  /** Expanded width in pixels */
  expandedWidth: number
}

/**
 * Measure the dimensions of expanded node content.
 * 
 * Creates a temporary DOM element matching the node structure to measure
 * the actual dimensions when notes and metadata are displayed. This allows
 * calculating the transform needed to keep the node centered during expansion.
 * 
 * **Measurement Process:**
 * 1. Creates a hidden temporary div element
 * 2. Copies all relevant styles from the actual node
 * 3. Builds the content structure (label + notes + metadata indicator)
 * 4. Measures the expanded dimensions
 * 5. Cleans up the temporary element
 * 
 * @param params - Parameters for measurement
 * @returns Expanded dimensions (height and width)
 * 
 * @example
 * ```ts
 * const dimensions = measureExpandedContent({
 *   nodeElement: nodeRef.current,
 *   collapsedHeight: 50,
 *   collapsedWidth: 120,
 *   label: 'My Concept',
 *   notes: 'Some notes here',
 *   hasMetadata: true,
 *   metadataFieldCount: 3
 * })
 * ```
 */
export function measureExpandedContent(
  params: MeasureExpandedContentParams
): ExpandedContentDimensions {
  const { nodeElement, collapsedWidth, label, notes, hasMetadata, metadataFieldCount } = params
  
  // Create a temporary measurement element that matches the node structure
  const tempDiv = document.createElement('div')
  const computedStyle = window.getComputedStyle(nodeElement)
  
  // Copy all relevant styles from the actual node
  tempDiv.style.position = 'absolute'
  tempDiv.style.visibility = 'hidden'
  tempDiv.style.opacity = '0'
  tempDiv.style.pointerEvents = 'none'
  tempDiv.style.top = '-9999px'
  tempDiv.style.left = '-9999px'
  tempDiv.style.padding = computedStyle.padding
  tempDiv.style.paddingTop = computedStyle.paddingTop
  tempDiv.style.paddingBottom = computedStyle.paddingBottom
  tempDiv.style.paddingLeft = computedStyle.paddingLeft
  tempDiv.style.paddingRight = computedStyle.paddingRight
  tempDiv.style.fontSize = computedStyle.fontSize
  tempDiv.style.fontFamily = computedStyle.fontFamily
  tempDiv.style.fontWeight = computedStyle.fontWeight
  tempDiv.style.lineHeight = computedStyle.lineHeight
  tempDiv.style.boxSizing = 'border-box'
  tempDiv.style.minWidth = computedStyle.minWidth
  tempDiv.style.maxWidth = '500px' // Reasonable max width for measurement
  
  // Build content matching the actual structure
  const labelDiv = document.createElement('div')
  labelDiv.style.fontWeight = '600'
  labelDiv.style.fontSize = '0.875rem'
  labelDiv.style.marginBottom = '0.25rem'
  labelDiv.textContent = label
  tempDiv.appendChild(labelDiv)
  
  if (notes) {
    const notesDiv = document.createElement('div')
    notesDiv.style.fontSize = '0.75rem'
    notesDiv.style.marginTop = '0.25rem'
    notesDiv.style.whiteSpace = 'pre-wrap'
    notesDiv.style.lineHeight = '1.5'
    notesDiv.textContent = notes
    tempDiv.appendChild(notesDiv)
  }
  
  if (hasMetadata) {
    const metadataDiv = document.createElement('div')
    metadataDiv.style.fontSize = '0.75rem'
    metadataDiv.style.marginTop = '0.5rem'
    metadataDiv.textContent = `${metadataFieldCount} metadata field(s)`
    tempDiv.appendChild(metadataDiv)
  }
  
  document.body.appendChild(tempDiv)
  
  // Force a reflow to ensure accurate measurement
  void tempDiv.offsetHeight
  
  // Measure expanded dimensions
  // Use scrollWidth to get the actual content width (even if constrained)
  // and offsetHeight for height
  const expandedHeight = tempDiv.offsetHeight
  const expandedWidth = Math.max(tempDiv.scrollWidth || tempDiv.offsetWidth, collapsedWidth)
  
  // Clean up
  document.body.removeChild(tempDiv)
  
  return {
    expandedHeight,
    expandedWidth,
  }
}

/**
 * Calculate CSS transform to keep node centered during expansion.
 * 
 * When a node expands to show notes/metadata, we need to translate it
 * to keep the center point fixed. This function calculates the transform
 * needed based on the difference between collapsed and expanded dimensions.
 * 
 * **Transform Calculation:**
 * - To expand from center: offset by half the size difference
 * - Original center: (x + collapsedWidth/2, y + collapsedHeight/2)
 * - Expanded center (without transform): (x + expandedWidth/2, y + expandedHeight/2)
 * - We need to move left by (expandedWidth - collapsedWidth)/2
 * - And move up by (expandedHeight - collapsedHeight)/2
 * 
 * @param collapsedWidth - Current node width in pixels
 * @param collapsedHeight - Current node height in pixels
 * @param expandedWidth - Expanded node width in pixels
 * @param expandedHeight - Expanded node height in pixels
 * @returns Transform object with x and y translations, or null if no transform needed
 * 
 * @example
 * ```ts
 * const transform = calculatePreviewTransform(120, 50, 200, 100)
 * // Returns: { x: -40, y: -25 } (moves left 40px, up 25px)
 * ```
 */
export function calculatePreviewTransform(
  collapsedWidth: number,
  collapsedHeight: number,
  expandedWidth: number,
  expandedHeight: number
): { x: number; y: number } | null {
  if (expandedHeight <= collapsedHeight && expandedWidth <= collapsedWidth) {
    return null
  }
  
  // Calculate the difference in dimensions
  const widthDiff = expandedWidth - collapsedWidth
  const heightDiff = expandedHeight - collapsedHeight
  
  // Move left by half the width increase (X decreases)
  const translateX = -widthDiff / 2
  // Move up by half the height increase (Y decreases)
  const translateY = -heightDiff / 2
  
  // Return transform values (no normalization needed as -0 === 0 in JavaScript)
  return { 
    x: translateX, 
    y: translateY 
  }
}

