/**
 * Calculate the horizontal bounding box width of an SVG path.
 * This gives us the horizontal space available for text wrapping.
 * 
 * @param pathD - SVG path data string (e.g., "M 10,10 L 20,20")
 * @returns Horizontal width (maxX - minX) in pixels, or 0 if calculation fails
 */
function getPathHorizontalWidth(pathD: string): number {
  if (typeof document === 'undefined' || !pathD) return 0
  
  try {
    const svgNS = 'http://www.w3.org/2000/svg'
    
    // Create a temporary SVG element and add it to the DOM temporarily
    // getBBox() requires the element to be in the DOM for accurate measurements
    const svg = document.createElementNS(svgNS, 'svg')
    svg.style.position = 'absolute'
    svg.style.visibility = 'hidden'
    svg.style.width = '0'
    svg.style.height = '0'
    document.body.appendChild(svg)
    
    const pathEl = document.createElementNS(svgNS, 'path')
    pathEl.setAttribute('d', pathD)
    svg.appendChild(pathEl)
    
    // Use getBBox() to get the bounding box
    const bbox = pathEl.getBBox()
    const horizontalWidth = bbox.width
    
    // Clean up
    document.body.removeChild(svg)
    
    return isFinite(horizontalWidth) && horizontalWidth > 0 ? horizontalWidth : 0
  } catch {
    return 0
  }
}

/**
 * Measure text width accurately using canvas or fallback estimation.
 * Accounts for font size, font weight (medium), and padding.
 * 
 * @param text - Text to measure
 * @param fontSize - Font size in pixels (default: 12px for text-xs)
 * @param padding - Horizontal padding in pixels (default: 16px for px-2 on both sides)
 * @returns Estimated width in pixels including padding
 */
function estimateTextWidth(text: string, fontSize: number = 12, padding: number = 16): number {
  if (!text) return 0
  
  // Try to use canvas for accurate measurement
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (context) {
        // Match the actual font used: text-xs font-medium
        // text-xs = 0.75rem = 12px (assuming 16px base)
        // font-medium = font-weight: 500
        context.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
        const measuredWidth = context.measureText(text).width
        return measuredWidth + padding
      }
    } catch {
      // Fall through to estimation if canvas fails
    }
  }
  
  // Fallback estimation: for font-medium, average character width is closer to 0.75 * fontSize
  // This is more accurate than 0.6 for medium-weight fonts
  const avgCharWidth = fontSize * 0.75
  return (text.length * avgCharWidth) + padding
}

/**
 * Custom React Flow edge component for Relationship edges.
 * 
 * Renders a relationship as an edge connecting two concept nodes with inline editing
 * capabilities. Supports multiple edge types (bezier, smoothstep, straight) and
 * visual feedback for collaborative editing.
 * 
 * **Features:**
 * - Inline label editing (click label to edit)
 * - Multiple edge types (bezier, smoothstep, straight)
 * - Directional labels (primary and reverse)
 * - Markdown notes preview (expandable)
 * - Metadata display (expandable)
 * - Style customization (edge type, color, style)
 * - Perspective editing (visual feedback for included/excluded relationships)
 * - Collaborative editing indicators
 * - Permission-based editing (read-only for users without write access)
 * 
 * **Edge Types:**
 * - `bezier`: Curved edge with control points (default)
 * - `smoothstep`: Step-like edge with rounded corners
 * - `straight`: Direct line between nodes
 * 
 * **Edge Styling:**
 * Style properties are stored in metadata:
 * - `edgeType`: 'bezier' | 'smoothstep' | 'straight'
 * - `edgeColor`: Edge color (default: gray)
 * - `edgeStyle`: Edge style ('solid', 'dashed', 'dotted', 'long-dash')
 * 
 * **Label Display:**
 * Shows the primary label (from → to direction) by default. The reverse label
 * is available when viewing from the opposite direction.
 * 
 * **Perspective Editing:**
 * When in perspective editing mode:
 * - Edges included in perspective are shown normally
 * - Edges not in perspective are greyed out
 * 
 * **Collaborative Editing:**
 * Shows visual feedback when other users are editing this relationship.
 * 
 * @param props - Edge props from React Flow
 * @param props.data - Edge data containing relationship entity and perspective state
 * @param props.selected - Whether the edge is currently selected
 * @param props.id - Edge ID (relationship ID)
 * @param props.source - Source node ID
 * @param props.target - Target node ID
 * @param props.sourceX - Source X coordinate
 * @param props.sourceY - Source Y coordinate
 * @param props.targetX - Target X coordinate
 * @param props.targetY - Target Y coordinate
 * @param props.sourcePosition - Source handle position
 * @param props.targetPosition - Target handle position
 * @returns The relationship edge JSX
 * 
 * @example
 * ```tsx
 * import { RelationshipEdge } from '@/components/relationship/RelationshipEdge'
 * 
 * // Register as a custom edge type
 * const edgeTypes = {
 *   default: RelationshipEdge
 * }
 * 
 * // Use in React Flow
 * <ReactFlow edgeTypes={edgeTypes} edges={edges} />
 * ```
 */

import { memo, useState, useRef, useEffect, useMemo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
  Position,
  useReactFlow,
  useNodes,
} from 'reactflow'
import type { RelationshipEdgeData } from '@/lib/reactFlowTypes'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'
import { useUIStore } from '@/stores/uiStore'
import { EdgeToolbar } from '@/components/toolbar/EdgeToolbar'

/**
 * Calculate control point offset based on source/target positions.
 * This mimics React Flow's internal bezier calculation.
 * 
 * @param sourcePosition - Source handle position
 * @param targetPosition - Target handle position
 * @param sourceX - Source X coordinate
 * @param sourceY - Source Y coordinate
 * @param targetX - Target X coordinate
 * @param targetY - Target Y coordinate
 * @returns Control point offset value
 */
function getControlPointOffset(
  sourcePosition: Position,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): number {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.sqrt(dx * dx + dy * dy)
  
  // Base offset similar to React Flow's default
  const baseOffset = length * 0.25
  
  // Adjust based on position
  if (sourcePosition === Position.Right || sourcePosition === Position.Left) {
    return Math.max(50, baseOffset)
  }
  return Math.max(50, baseOffset)
}

/**
 * Extract handle index from handle ID (e.g., "bottom-2" -> 2)
 */
function getHandleIndex(handleId: string | null | undefined): number {
  if (!handleId) return 2 // Default to middle handle
  const match = handleId.match(/(?:top|bottom)-(\d+)/)
  return match ? parseInt(match[1], 10) : 2
}

/**
 * Derive step/smoothstep orientations based on relative positions.
 * Ensures the final segment approaches the target from the correct side
 * even when node handles are defined on top/bottom.
 */
function deriveStepPositions(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): { sourcePosition: Position; targetPosition: Position } {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const horizontal = Math.abs(dx) >= Math.abs(dy)
  
  let sPos: Position
  let tPos: Position
  
  if (horizontal) {
    // Approach horizontally
    sPos = dx > 0 ? Position.Right : Position.Left
    tPos = dx > 0 ? Position.Left : Position.Right
  } else {
    // Approach vertically
    sPos = dy > 0 ? Position.Bottom : Position.Top
    tPos = dy > 0 ? Position.Top : Position.Bottom
  }
  
  return { sourcePosition: sPos, targetPosition: tPos }
}

/**
 * Calculate a point on a cubic bezier curve at parameter t.
 * 
 * @param t - Parameter value (0 to 1)
 * @param x0 - Start X
 * @param y0 - Start Y
 * @param x1 - First control point X
 * @param y1 - First control point Y
 * @param x2 - Second control point X
 * @param y2 - Second control point Y
 * @param x3 - End X
 * @param y3 - End Y
 * @returns Point coordinates
 */
function bezierPoint(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): { x: number; y: number } {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t
  
  return {
    x: mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
    y: mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3,
  }
}

/**
 * Calculate the tangent vector (derivative) of a cubic bezier curve at parameter t.
 * 
 * @param t - Parameter value (0 to 1)
 * @param x0 - Start X
 * @param y0 - Start Y
 * @param x1 - First control point X
 * @param y1 - First control point Y
 * @param x2 - Second control point X
 * @param y2 - Second control point Y
 * @param x3 - End X
 * @param y3 - End Y
 * @returns Tangent vector
 */
function bezierTangent(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): { x: number; y: number } {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t
  
  return {
    x: 3 * mt2 * (x1 - x0) + 6 * mt * t * (x2 - x1) + 3 * t2 * (x3 - x2),
    y: 3 * mt2 * (y1 - y0) + 6 * mt * t * (y2 - y1) + 3 * t2 * (y3 - y2),
  }
}

/**
 * Find where a bezier curve intersects a node's boundary.
 * Uses binary search to find the intersection point along the curve.
 * 
 * @param nodeCenterX - X coordinate of node center
 * @param nodeCenterY - Y coordinate of node center
 * @param nodeWidth - Width of the node
 * @param nodeHeight - Height of the node
 * @param x0 - Bezier start X
 * @param y0 - Bezier start Y
 * @param x1 - Bezier first control point X
 * @param y1 - Bezier first control point Y
 * @param x2 - Bezier second control point X
 * @param y2 - Bezier second control point Y
 * @param x3 - Bezier end X (center)
 * @param y3 - Bezier end Y (center)
 * @returns Intersection point and tangent angle, or null if not found
 */
function findBezierBoundaryIntersection(
  nodeCenterX: number,
  nodeCenterY: number,
  nodeWidth: number,
  nodeHeight: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): { x: number; y: number; angle: number; exactPointX?: number; exactPointY?: number } | null {
  // ... existing code ...
  // NOTE: This function remains as a fallback. See the SVG path based approach below for the primary implementation.
  // Account for node border (2px on each side) - React Flow dimensions include border
  // But we want the visual boundary, which is the outer edge of the border
  // So we use the full dimensions as-is
  const halfWidth = nodeWidth / 2
  const halfHeight = nodeHeight / 2
  const topY = nodeCenterY - halfHeight
  const bottomY = nodeCenterY + halfHeight
  const leftX = nodeCenterX - halfWidth
  const rightX = nodeCenterX + halfWidth
  
  // Check if a point is inside the node boundary
  const isInside = (x: number, y: number): boolean => {
    return x >= leftX && x <= rightX && y >= topY && y <= bottomY
  }
  
  // Find exact intersections with each boundary by solving bezier equations
  // For left/right: solve x(t) = leftX or x(t) = rightX
  // For top/bottom: solve y(t) = topY or y(t) = bottomY
  const allIntersections: Array<{ x: number; y: number; t: number; edge: 'top' | 'bottom' | 'left' | 'right' }> = []
  
  // Helper function to find t where bezier x(t) = targetX using binary search
  const findTForX = (targetX: number, tMin: number, tMax: number): number | null => {
    const epsilon = 0.0001
    let low = tMin
    let high = tMax
    
    // First, verify that there's a crossing in this range
    const pLow = bezierPoint(low, x0, y0, x1, y1, x2, y2, x3, y3)
    const pHigh = bezierPoint(high, x0, y0, x1, y1, x2, y2, x3, y3)
    
    // Check if targetX is between the x values
    if ((pLow.x < targetX && pHigh.x < targetX) || (pLow.x > targetX && pHigh.x > targetX)) {
      return null // No crossing in this range
    }
    
    // Binary search for exact t
    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2
      const pMid = bezierPoint(mid, x0, y0, x1, y1, x2, y2, x3, y3)
      const error = pMid.x - targetX
      
      if (Math.abs(error) < epsilon) {
        return mid
      }
      
      if ((pLow.x < targetX && pMid.x < targetX) || (pLow.x > targetX && pMid.x > targetX)) {
        low = mid
      } else {
        high = mid
      }
      
      if (high - low < epsilon) break
    }
    
    return (low + high) / 2
  }
  
  // Helper function to find t where bezier y(t) = targetY using binary search
  const findTForY = (targetY: number, tMin: number, tMax: number): number | null => {
    const epsilon = 0.0001
    let low = tMin
    let high = tMax
    
    // First, verify that there's a crossing in this range
    const pLow = bezierPoint(low, x0, y0, x1, y1, x2, y2, x3, y3)
    const pHigh = bezierPoint(high, x0, y0, x1, y1, x2, y2, x3, y3)
    
    // Check if targetY is between the y values
    if ((pLow.y < targetY && pHigh.y < targetY) || (pLow.y > targetY && pHigh.y > targetY)) {
      return null // No crossing in this range
    }
    
    // Binary search for exact t
    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2
      const pMid = bezierPoint(mid, x0, y0, x1, y1, x2, y2, x3, y3)
      const error = pMid.y - targetY
      
      if (Math.abs(error) < epsilon) {
        return mid
      }
      
      if ((pLow.y < targetY && pMid.y < targetY) || (pLow.y > targetY && pMid.y > targetY)) {
        low = mid
      } else {
        high = mid
      }
      
      if (high - low < epsilon) break
    }
    
    return (low + high) / 2
  }
  
  // Sample curve to find ranges where it might cross boundaries
  // Use adaptive sampling: more samples for longer curves
  const curveLength = Math.sqrt((x3 - x0) ** 2 + (y3 - y0) ** 2)
  const sampleCount = Math.max(500, Math.min(2000, Math.floor(curveLength / 2))) // Adaptive: 500-2000 samples based on curve length
  let lastOutsidePoint = bezierPoint(0, x0, y0, x1, y1, x2, y2, x3, y3)
  let prevPoint = lastOutsidePoint
  let prevT = 0
  let prevWasInside = isInside(prevPoint.x, prevPoint.y)
  
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount
    const point = bezierPoint(t, x0, y0, x1, y1, x2, y2, x3, y3)
    const isNowInside = isInside(point.x, point.y)
    
    // Detect boundary crossing: transition from outside to inside
    if (!prevWasInside && isNowInside) {
      // Found transition - now find exact intersection in this range
      const tOutside = prevT
      const tInside = t
      
      // Check each boundary
      // Left boundary: x(t) = leftX
      const tLeft = findTForX(leftX, tOutside, tInside)
      if (tLeft !== null) {
        const pLeft = bezierPoint(tLeft, x0, y0, x1, y1, x2, y2, x3, y3)
        // Verify: point must be on the left boundary segment AND outside before entering
        if (pLeft.y >= topY && pLeft.y <= bottomY && 
            Math.abs(pLeft.x - leftX) < 1.0 && // Actually on the boundary
            !isInside(prevPoint.x, prevPoint.y)) {
          allIntersections.push({ edge: 'left', t: tLeft, x: leftX, y: pLeft.y })
        }
      }
      
      // Right boundary: x(t) = rightX
      const tRight = findTForX(rightX, tOutside, tInside)
      if (tRight !== null) {
        const pRight = bezierPoint(tRight, x0, y0, x1, y1, x2, y2, x3, y3)
        // Verify: point must be on the right boundary segment AND outside before entering
        if (pRight.y >= topY && pRight.y <= bottomY && 
            Math.abs(pRight.x - rightX) < 1.0 && // Actually on the boundary
            !isInside(prevPoint.x, prevPoint.y)) {
          allIntersections.push({ edge: 'right', t: tRight, x: rightX, y: pRight.y })
        }
      }
      
      // Top boundary: y(t) = topY
      const tTop = findTForY(topY, tOutside, tInside)
      if (tTop !== null) {
        const pTop = bezierPoint(tTop, x0, y0, x1, y1, x2, y2, x3, y3)
        // Verify: point must be on the top boundary segment AND outside before entering
        if (pTop.x >= leftX && pTop.x <= rightX && 
            Math.abs(pTop.y - topY) < 1.0 && // Actually on the boundary
            !isInside(prevPoint.x, prevPoint.y)) {
          allIntersections.push({ edge: 'top', t: tTop, x: pTop.x, y: topY })
        }
      }
      
      // Bottom boundary: y(t) = bottomY
      const tBottom = findTForY(bottomY, tOutside, tInside)
      if (tBottom !== null) {
        const pBottom = bezierPoint(tBottom, x0, y0, x1, y1, x2, y2, x3, y3)
        // Verify: point must be on the bottom boundary segment AND outside before entering
        if (pBottom.x >= leftX && pBottom.x <= rightX && 
            Math.abs(pBottom.y - bottomY) < 1.0 && // Actually on the boundary
            !isInside(prevPoint.x, prevPoint.y)) {
          allIntersections.push({ edge: 'bottom', t: tBottom, x: pBottom.x, y: bottomY })
        }
      }
    }
    
    // Update tracking
    if (!isNowInside) {
      lastOutsidePoint = point
    }
    prevPoint = point
    prevT = t
    prevWasInside = isNowInside
  }
  
  // Validate intersections and pick the first valid one (lowest t)
  if (allIntersections.length === 0) {
    // Fallback: curve never enters node
    const tangent = bezierTangent(0, x0, y0, x1, y1, x2, y2, x3, y3)
    const angle = Math.atan2(tangent.y, tangent.x) * (180 / Math.PI)
    return { 
      x: lastOutsidePoint.x, 
      y: lastOutsidePoint.y, 
      angle,
      exactPointX: lastOutsidePoint.x,
      exactPointY: lastOutsidePoint.y
    }
  }
  
  // Validate intersections: check that curve actually crosses boundary at calculated t
  // More strict validation: curve must be ON the boundary, not just close
  const validIntersections = allIntersections.filter(int => {
    const curvePoint = bezierPoint(int.t, x0, y0, x1, y1, x2, y2, x3, y3)
    const tolerance = 0.5 // Stricter tolerance
    
    let isValid = false
    if (int.edge === 'top') {
      // Top edge: curve Y should be at topY (or very close)
      isValid = Math.abs(curvePoint.y - topY) < tolerance && curvePoint.x >= leftX && curvePoint.x <= rightX
    } else if (int.edge === 'bottom') {
      // Bottom edge: curve Y should be at bottomY (or very close)
      isValid = Math.abs(curvePoint.y - bottomY) < tolerance && curvePoint.x >= leftX && curvePoint.x <= rightX
    } else if (int.edge === 'left') {
      // Left edge: curve X should be at leftX (or very close)
      isValid = Math.abs(curvePoint.x - leftX) < tolerance && curvePoint.y >= topY && curvePoint.y <= bottomY
    } else { // right
      // Right edge: curve X should be at rightX (or very close)
      isValid = Math.abs(curvePoint.x - rightX) < tolerance && curvePoint.y >= topY && curvePoint.y <= bottomY
    }
    
    return isValid
  })
  
  if (validIntersections.length === 0) {
    // Fallback: no valid intersections
    const tangent = bezierTangent(0, x0, y0, x1, y1, x2, y2, x3, y3)
    const angle = Math.atan2(tangent.y, tangent.x) * (180 / Math.PI)
    return { 
      x: lastOutsidePoint.x, 
      y: lastOutsidePoint.y, 
      angle,
      exactPointX: lastOutsidePoint.x,
      exactPointY: lastOutsidePoint.y
    }
  }
  
  // Pick the intersection closest to source (lowest t) - that's the actual entry edge
  const closest = validIntersections.reduce((prev, curr) => (curr.t < prev.t ? curr : prev))
  const entryEdge = closest.edge
  // Use the actual boundary coordinates, not the interpolated values
  // For vertical edges (top/bottom), we need to find where y(t) = topY or bottomY
  // For horizontal edges (left/right), we need to find where x(t) = leftX or rightX
  const targetY = closest.edge === 'top' ? topY : closest.edge === 'bottom' ? bottomY : undefined
  const targetX = closest.edge === 'left' ? leftX : closest.edge === 'right' ? rightX : undefined
  
  // Find t values that bracket the intersection
  // Start from a point that's definitely outside the node
  // For long curves, closest.t might already be slightly inside, so we need to go back further
  let tLow = Math.max(0, closest.t - 0.05) // Increased range for long curves
  let tHigh = Math.min(1, closest.t + 0.01)
  
  // Ensure tLow is actually outside the node
  let pLow = bezierPoint(tLow, x0, y0, x1, y1, x2, y2, x3, y3)
  while (isInside(pLow.x, pLow.y) && tLow > 0) {
    tLow = Math.max(0, tLow - 0.01)
    pLow = bezierPoint(tLow, x0, y0, x1, y1, x2, y2, x3, y3)
  }
  
  // Refine bracket to ensure tLow is outside and tHigh is inside
  for (let refine = 0; refine < 10; refine++) {
    const pLow = bezierPoint(tLow, x0, y0, x1, y1, x2, y2, x3, y3)
    const pHigh = bezierPoint(tHigh, x0, y0, x1, y1, x2, y2, x3, y3)
    if (!isInside(pLow.x, pLow.y) && isInside(pHigh.x, pHigh.y)) {
      break
    }
    if (isInside(pLow.x, pLow.y)) {
      tLow = Math.max(0, tLow - 0.01)
    }
    if (!isInside(pHigh.x, pHigh.y)) {
      tHigh = Math.min(1, tHigh + 0.01)
    }
  }
  
  // Refine t value using Newton's method with tighter tolerance
  // Start from tLow (outside) and refine towards the boundary
  // This ensures we find the actual entry point, not a point already inside
  let refinedT = (tLow + tHigh) / 2 // Start from middle of bracket
  const epsilon = 0.00001 // Tighter tolerance for extreme cases
  
  if (targetY !== undefined) {
    // Horizontal edge: find exact t where bezier y(t) = targetY
    for (let iter = 0; iter < 100; iter++) {
      const p = bezierPoint(refinedT, x0, y0, x1, y1, x2, y2, x3, y3)
      const error = p.y - targetY
      
      if (Math.abs(error) < epsilon) break
      
      const tangent = bezierTangent(refinedT, x0, y0, x1, y1, x2, y2, x3, y3)
      if (Math.abs(tangent.y) > 0.0001) {
        const deltaT = -error / tangent.y
        const newT = Math.max(tLow, Math.min(tHigh, refinedT + deltaT))
        // Prevent oscillation by checking if we're making progress
        if (Math.abs(newT - refinedT) < 0.000001) break
        refinedT = newT
      } else {
        // Binary search fallback
        refinedT = (tLow + tHigh) / 2
        const p2 = bezierPoint(refinedT, x0, y0, x1, y1, x2, y2, x3, y3)
        if ((targetY === topY && p2.y < targetY) || (targetY === bottomY && p2.y > targetY)) {
          tLow = refinedT
        } else {
          tHigh = refinedT
        }
      }
      if (tHigh - tLow < epsilon) break
    }
  } else if (targetX !== undefined) {
    // Vertical edge: find exact t where bezier x(t) = targetX
    for (let iter = 0; iter < 100; iter++) {
      const p = bezierPoint(refinedT, x0, y0, x1, y1, x2, y2, x3, y3)
      const error = p.x - targetX
      
      if (Math.abs(error) < epsilon) break
      
      const tangent = bezierTangent(refinedT, x0, y0, x1, y1, x2, y2, x3, y3)
      if (Math.abs(tangent.x) > 0.0001) {
        const deltaT = -error / tangent.x
        const newT = Math.max(tLow, Math.min(tHigh, refinedT + deltaT))
        // Prevent oscillation by checking if we're making progress
        if (Math.abs(newT - refinedT) < 0.000001) break
        refinedT = newT
      } else {
        // Binary search fallback
        refinedT = (tLow + tHigh) / 2
        const p2 = bezierPoint(refinedT, x0, y0, x1, y1, x2, y2, x3, y3)
        if ((targetX === leftX && p2.x < targetX) || (targetX === rightX && p2.x > targetX)) {
          tLow = refinedT
        } else {
          tHigh = refinedT
        }
      }
      if (tHigh - tLow < epsilon) break
    }
  }
  
  // Get exact point on curve and project onto boundary
  const curvePoint = bezierPoint(refinedT, x0, y0, x1, y1, x2, y2, x3, y3)
  const tangent = bezierTangent(refinedT, x0, y0, x1, y1, x2, y2, x3, y3)
  const angle = Math.atan2(tangent.y, tangent.x) * (180 / Math.PI)
  
  // Verify refinement accuracy - curvePoint should be very close to boundary
  // For extreme cases, we need tighter tolerance
  let correctedPoint = { x: curvePoint.x, y: curvePoint.y }
  if (targetX !== undefined) {
    const xError = Math.abs(curvePoint.x - targetX)
    if (xError > 0.001) {
      // Refinement didn't converge well, use targetX directly
      // Recalculate Y by finding where the curve crosses the boundary
      // Use binary search to find Y where x(t) = targetX
      let tForX = refinedT
      for (let iter = 0; iter < 20; iter++) {
        const p = bezierPoint(tForX, x0, y0, x1, y1, x2, y2, x3, y3)
        const error = p.x - targetX
        if (Math.abs(error) < 0.0001) break
        const tan = bezierTangent(tForX, x0, y0, x1, y1, x2, y2, x3, y3)
        if (Math.abs(tan.x) > 0.0001) {
          const deltaT = -error / tan.x
          tForX = Math.max(tLow, Math.min(tHigh, tForX + deltaT))
        } else {
          break
        }
      }
      const finalPoint = bezierPoint(tForX, x0, y0, x1, y1, x2, y2, x3, y3)
      correctedPoint = { x: targetX, y: finalPoint.y }
    }
  } else if (targetY !== undefined) {
    const yError = Math.abs(curvePoint.y - targetY)
    if (yError > 0.001) {
      // Refinement didn't converge well, use targetY directly
      // Recalculate X by finding where the curve crosses the boundary
      let tForY = refinedT
      for (let iter = 0; iter < 20; iter++) {
        const p = bezierPoint(tForY, x0, y0, x1, y1, x2, y2, x3, y3)
        const error = p.y - targetY
        if (Math.abs(error) < 0.0001) break
        const tan = bezierTangent(tForY, x0, y0, x1, y1, x2, y2, x3, y3)
        if (Math.abs(tan.y) > 0.0001) {
          const deltaT = -error / tan.y
          tForY = Math.max(tLow, Math.min(tHigh, tForY + deltaT))
        } else {
          break
        }
      }
      const finalPoint = bezierPoint(tForY, x0, y0, x1, y1, x2, y2, x3, y3)
      correctedPoint = { x: finalPoint.x, y: targetY }
    }
  }
  
  // Project onto exact boundary coordinate
  // Ensure exactPoint is precisely on the boundary line
  let exactPoint: { x: number; y: number }
  if (targetY !== undefined) {
    // Horizontal edge (top/bottom): X comes from curve, Y is the boundary coordinate
    // After refining t where y(t) = targetY, get the X coordinate from the curve
    // Clamp X to ensure it's within the node boundaries
    const clampedX = Math.max(leftX, Math.min(rightX, correctedPoint.x))
    exactPoint = { x: clampedX, y: targetY }
  } else if (targetX !== undefined) {
    // Vertical edge (left/right): Y comes from curve, X is the boundary coordinate
    // After refining t where x(t) = targetX, get the Y coordinate from the curve
    // Clamp Y to ensure it's within the node boundaries
    const clampedY = Math.max(topY, Math.min(bottomY, correctedPoint.y))
    exactPoint = { x: targetX, y: clampedY }
  } else {
    exactPoint = correctedPoint
  }
  
  // Final validation: ensure exactPoint is actually on the boundary
  // If it's not, something went wrong - use the closest boundary point
  if (targetX !== undefined) {
    // For vertical edges, Y must be between topY and bottomY
    if (exactPoint.y < topY) {
      exactPoint.y = topY
    } else if (exactPoint.y > bottomY) {
      exactPoint.y = bottomY
    }
  } else if (targetY !== undefined) {
    // For horizontal edges, X must be between leftX and rightX
    if (exactPoint.x < leftX) {
      exactPoint.x = leftX
    } else if (exactPoint.x > rightX) {
      exactPoint.x = rightX
    }
  }
  
  // Apply adaptive offset along tangent to position arrowhead on the boundary
  // Offset direction and amount depend on entry edge to account for node styling (shadows, borders)
  const tangentLength = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y)
  let finalX = exactPoint.x
  let finalY = exactPoint.y
  
  if (tangentLength > 0.001) {
    // Determine offset based on entry edge
    // Positive offset moves along tangent (towards node center)
    // Negative offset moves opposite to tangent (away from node center)
    let offset: number
    
    switch (entryEdge) {
      case 'top':
        // Entering from top: move inward slightly to account for shadow/border
        offset = 2
        break
      case 'bottom':
        // Entering from bottom: move outward to avoid being too deep (shadow makes it appear deeper)
        offset = -1.5
        break
      case 'left':
        // Entering from left: move inward more to reach boundary
        offset = 4
        break
      case 'right':
        // Entering from right: move inward more to reach boundary
        offset = 4
        break
      default:
        offset = 2
    }
    
    finalX += (tangent.x / tangentLength) * offset
    finalY += (tangent.y / tangentLength) * offset
  }
  
  return { 
    x: finalX, 
    y: finalY, 
    angle,
    exactPointX: exactPoint.x,
    exactPointY: exactPoint.y
  }
}

/**
 * Find the boundary intersection using the actual SVG path geometry.
 * This avoids numeric issues by querying the browser's path sampling API.
 *
 * Algorithm:
 * - Build a temporary SVGPathElement with the same "d" used to render the edge
 * - Walk backwards from the end of the path (inside the node) until we find a point outside
 * - Binary search between outside/inside lengths to find the entry crossing
 * - Snap to the nearest rectangle side and compute a tangent for arrow rotation
 *
 * Returns the final arrow position (with adaptive offset), and the exact intersection (for red dot).
 */
function findPathBoundaryIntersectionUsingSVG(
  nodeCenterX: number,
  nodeCenterY: number,
  nodeWidth: number,
  nodeHeight: number,
  pathD: string
): { x: number; y: number; angle: number; exactPointX?: number; exactPointY?: number; trimLength?: number } | null {
  // Guard for SSR or missing DOM
  if (typeof document === 'undefined') return null
  if (!pathD || !Number.isFinite(nodeCenterX) || !Number.isFinite(nodeCenterY)) return null
  
  const halfW = nodeWidth / 2
  const halfH = nodeHeight / 2
  const leftX = nodeCenterX - halfW
  const rightX = nodeCenterX + halfW
  const topY = nodeCenterY - halfH
  const bottomY = nodeCenterY + halfH
  
  const isInside = (x: number, y: number): boolean =>
    x >= leftX && x <= rightX && y >= topY && y <= bottomY
  
  // Build a temporary SVG path to query geometry
  const svgNS = 'http://www.w3.org/2000/svg'
  const pathEl = document.createElementNS(svgNS, 'path')
  pathEl.setAttribute('d', pathD)
  
  let totalLength = 0
  try {
    totalLength = pathEl.getTotalLength()
  } catch {
    // If the path is invalid, bail out
    return null
  }
  if (!isFinite(totalLength) || totalLength <= 0) return null
  
  // Helper to get point at length
  const pointAt = (s: number) => pathEl.getPointAtLength(Math.max(0, Math.min(totalLength, s)))
  const insideAt = (s: number) => {
    const p = pointAt(s)
    return isInside(p.x, p.y)
  }
  
  // End of path is target center: should be inside
  let sHigh = totalLength
  if (!insideAt(sHigh)) {
    // If not inside (shouldn't happen), walk forward to find an inside segment
    // Fallback to bezier approach by returning null
    return null
  }
  
  // Walk backwards to find an outside point
  let sLow = sHigh
  let step = Math.max(2, totalLength / 128) // adaptive step
  let safety = 0
  while (sLow > 0 && insideAt(sLow) && safety < 256) {
    sLow -= step
    step *= 1.1 // expand step gradually
    safety++
  }
  sLow = Math.max(0, sLow)
  
  // If we never left the node, we can't find an entry crossing
  if (insideAt(sLow)) {
    // As a fallback, snap to the nearest side from the end
    const end = pointAt(sHigh)
    const dxs = [Math.abs(end.x - leftX), Math.abs(end.x - rightX)]
    const dys = [Math.abs(end.y - topY), Math.abs(end.y - bottomY)]
    const minX = Math.min(...dxs)
    const minY = Math.min(...dys)
    let snapX = end.x
    let snapY = end.y
    let entryEdge: 'top' | 'bottom' | 'left' | 'right' = 'left'
    
    if (minX < minY) {
      // Closer to a vertical side
      if (dxs[0] < dxs[1]) {
        snapX = leftX
        entryEdge = 'left'
      } else {
        snapX = rightX
        entryEdge = 'right'
      }
      snapY = Math.max(topY, Math.min(bottomY, end.y))
    } else {
      // Closer to a horizontal side
      if (dys[0] < dys[1]) {
        snapY = topY
        entryEdge = 'top'
      } else {
        snapY = bottomY
        entryEdge = 'bottom'
      }
      snapX = Math.max(leftX, Math.min(rightX, end.x))
    }
    
    // Estimate tangent near the end
    const prev = pointAt(Math.max(0, sHigh - 1))
    const dx = end.x - prev.x
    const dy = end.y - prev.y
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    
    // Apply adaptive offset along tangent
    const len = Math.hypot(dx, dy)
    let fx = snapX
    let fy = snapY
    if (len > 0.0001) {
      let offset = 2
      switch (entryEdge) {
        case 'top':
          offset = 2
          break
        case 'bottom':
          offset = -1.5
          break
        case 'left':
        case 'right':
          offset = 4
          break
      }
      fx += (dx / len) * offset
      fy += (dy / len) * offset
    }
    
    return { x: fx, y: fy, angle, exactPointX: snapX, exactPointY: snapY, trimLength: sHigh }
  }
  
  // Binary search between sLow (outside) and sHigh (inside) to find the boundary
  let iterations = 0
  while (iterations < 40 && Math.abs(sHigh - sLow) > 0.25) {
    const mid = (sLow + sHigh) / 2
    if (insideAt(mid)) {
      sHigh = mid
    } else {
      sLow = mid
    }
    iterations++
  }
  
  // Use the inside endpoint as our intersection sample
  const p = pointAt(sHigh)
  
  // Determine the closest side and snap to it
  const dxLeft = Math.abs(p.x - leftX)
  const dxRight = Math.abs(p.x - rightX)
  const dyTop = Math.abs(p.y - topY)
  const dyBottom = Math.abs(p.y - bottomY)
  
  let exactX = p.x
  let exactY = p.y
  let entryEdge: 'top' | 'bottom' | 'left' | 'right' = 'left'
  
  const minX = Math.min(dxLeft, dxRight)
  const minY = Math.min(dyTop, dyBottom)
  
  if (minX < minY) {
    if (dxLeft < dxRight) {
      exactX = leftX
      entryEdge = 'left'
    } else {
      exactX = rightX
      entryEdge = 'right'
    }
    exactY = Math.max(topY, Math.min(bottomY, p.y))
  } else {
    if (dyTop < dyBottom) {
      exactY = topY
      entryEdge = 'top'
    } else {
      exactY = bottomY
      entryEdge = 'bottom'
    }
    exactX = Math.max(leftX, Math.min(rightX, p.x))
  }
  
  // Estimate tangent at the intersection
  const prev = pointAt(Math.max(0, sHigh - 1))
  let dx = p.x - prev.x
  let dy = p.y - prev.y
  let angle = Math.atan2(dy, dx) * (180 / Math.PI)
  
  // Apply adaptive offset along tangent to position arrowhead on the boundary
  const segLen = Math.hypot(dx, dy)
  let finalX = exactX
  let finalY = exactY
  if (segLen > 0.0001) {
    let offset = 2
    switch (entryEdge) {
      case 'top':
        offset = 2
        break
      case 'bottom':
        offset = -1.5
        break
      case 'left':
      case 'right':
        offset = 4
        break
    }
    finalX += (dx / segLen) * offset
    finalY += (dy / segLen) * offset
  }
  
  return {
    x: finalX,
    y: finalY,
    angle,
    exactPointX: exactX,
    exactPointY: exactY,
    trimLength: sHigh,
  }
}

/**
 * Calculate the intersection point of a straight line with a node's boundary.
 * Used for non-bezier edge types.
 * 
 * @param nodeCenterX - X coordinate of node center (handle position)
 * @param nodeCenterY - Y coordinate of node center (handle position)
 * @param nodeWidth - Width of the node
 * @param nodeHeight - Height of the node
 * @param edgeStartX - X coordinate of edge start point
 * @param edgeStartY - Y coordinate of edge start point
 * @returns Object with x, y coordinates and angle of intersection point
 */
function getNodeBoundaryIntersection(
  nodeCenterX: number,
  nodeCenterY: number,
  nodeWidth: number,
  nodeHeight: number,
  edgeStartX: number,
  edgeStartY: number
): { x: number; y: number; angle: number } {
  // Calculate direction vector from edge start to node center
  const dx = nodeCenterX - edgeStartX
  const dy = nodeCenterY - edgeStartY
  
  // Handle edge case where start and center are the same
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: nodeCenterX, y: nodeCenterY, angle: 0 }
  }
  
  // Calculate angle from direction vector
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  
  // Calculate half dimensions
  const halfWidth = nodeWidth / 2
  const halfHeight = nodeHeight / 2
  
  // Visual offset to account for node border (2px) and padding
  // Top entries appear too far back, so we move them down (increase Y)
  // Bottom entries appear too deep, so we move them up (decrease Y)
  // Left entries appear too far back, so we move them right (increase X)
  // Right entries appear too deep, so we move them left (decrease X)
  const VISUAL_OFFSET_Y = 1.5 // Adjust to match visual boundary
  const VISUAL_OFFSET_X = 1.5 // Adjust to match visual boundary
  
  // Calculate intersection with node boundary
  // We need to find which edge of the rectangle the line intersects
  // Calculate intersections with all four edges and pick the closest one
  
  const intersections: Array<{ x: number; y: number; t: number }> = []
  
  // Top edge: y = nodeCenterY - halfHeight
  if (Math.abs(dy) > 0.001) {
    const topY = nodeCenterY - halfHeight
    const topT = (topY - edgeStartY) / dy
    if (topT > 0 && topT <= 1) {
      const topX = edgeStartX + dx * topT
      if (topX >= nodeCenterX - halfWidth && topX <= nodeCenterX + halfWidth) {
        intersections.push({ x: topX, y: topY, t: topT })
      }
    }
  }
  
  // Bottom edge: y = nodeCenterY + halfHeight
  if (Math.abs(dy) > 0.001) {
    const bottomY = nodeCenterY + halfHeight
    const bottomT = (bottomY - edgeStartY) / dy
    if (bottomT > 0 && bottomT <= 1) {
      const bottomX = edgeStartX + dx * bottomT
      if (bottomX >= nodeCenterX - halfWidth && bottomX <= nodeCenterX + halfWidth) {
        intersections.push({ x: bottomX, y: bottomY, t: bottomT })
      }
    }
  }
  
  // Left edge: x = nodeCenterX - halfWidth
  if (Math.abs(dx) > 0.001) {
    const leftX = nodeCenterX - halfWidth
    const leftT = (leftX - edgeStartX) / dx
    if (leftT > 0 && leftT <= 1) {
      const leftY = edgeStartY + dy * leftT
      if (leftY >= nodeCenterY - halfHeight && leftY <= nodeCenterY + halfHeight) {
        intersections.push({ x: leftX, y: leftY, t: leftT })
      }
    }
  }
  
  // Right edge: x = nodeCenterX + halfWidth
  if (Math.abs(dx) > 0.001) {
    const rightX = nodeCenterX + halfWidth
    const rightT = (rightX - edgeStartX) / dx
    if (rightT > 0 && rightT <= 1) {
      const rightY = edgeStartY + dy * rightT
      if (rightY >= nodeCenterY - halfHeight && rightY <= nodeCenterY + halfHeight) {
        intersections.push({ x: rightX, y: rightY, t: rightT })
      }
    }
  }
  
  // If we have intersections, pick the one closest to the edge start (smallest t)
  // This ensures we get the first intersection point along the line
  if (intersections.length > 0) {
    const closest = intersections.reduce((prev, curr) => (curr.t < prev.t ? curr : prev))
    
    // Apply visual offset: top entries need to move down, bottom entries need to move up
    // Left entries need to move right, right entries need to move left
    let finalY = closest.y
    let finalX = closest.x
    
    if (Math.abs(closest.y - (nodeCenterY - halfHeight)) < 0.001) {
      // Top edge: move down (increase Y) to match visual boundary
      finalY += VISUAL_OFFSET_Y
    } else if (Math.abs(closest.y - (nodeCenterY + halfHeight)) < 0.001) {
      // Bottom edge: move up (decrease Y) to match visual boundary
      finalY -= VISUAL_OFFSET_Y
    } else if (Math.abs(closest.x - (nodeCenterX - halfWidth)) < 0.001) {
      // Left edge: move left (decrease X) to move arrowhead outward from boundary
      finalX -= VISUAL_OFFSET_X
    } else if (Math.abs(closest.x - (nodeCenterX + halfWidth)) < 0.001) {
      // Right edge: move right (increase X) to move arrowhead outward from boundary
      finalX += VISUAL_OFFSET_X
    }
    
    return { 
      x: finalX, 
      y: finalY, 
      angle
    }
  }
  
  // Fallback: if no valid intersection found, return center
  // This can happen if the edge starts inside the node
  return { 
    x: nodeCenterX, 
    y: nodeCenterY, 
    angle: 0
  }
}

/**
 * Custom bezier path with offset control points for separating overlapping edges
 * Bends left for left handles, right for right handles (matching handle selection logic)
 */
function getBezierPathWithOffset(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  sourceHandleId: string | null | undefined,
  targetHandleId: string | null | undefined
): [string, number, number] {
  const offset = getControlPointOffset(sourcePosition, sourceX, sourceY, targetX, targetY)
  
  // Extract handle indices to determine bend direction
  const sourceHandleIndex = getHandleIndex(sourceHandleId)
  const targetHandleIndex = getHandleIndex(targetHandleId)
  const handleIndex = Math.max(sourceHandleIndex, targetHandleIndex)
  
  // Determine bend direction based on handle position relative to center
  // Middle handle (index 2) = no bend, left handles (< 2) = bend left, right handles (> 2) = bend right
  const MAX_HANDLES_PER_SIDE = 5
  const middleHandleIndex = Math.floor(MAX_HANDLES_PER_SIDE / 2) // 2
  const offsetFromCenter = handleIndex - middleHandleIndex
  
  // Calculate control points with directional offset
  let controlX1: number
  let controlY1: number
  let controlX2: number
  let controlY2: number
  
  // Calculate direction vector
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.sqrt(dx * dx + dy * dy)
  
  if (length === 0) {
    // Fallback for zero-length edges
    controlX1 = sourceX
    controlY1 = sourceY
    controlX2 = targetX
    controlY2 = targetY
  } else {
    // Calculate perpendicular vector for offset (points left when looking from source to target)
    const perpX = -dy / length
    const perpY = dx / length
    
    // Calculate bend amount - stronger bend for handles further from center
    const bendAmount = 50 // Base pixels of bend
    const controlPointOffset = offsetFromCenter * bendAmount
    
    // Apply perpendicular offset to control points (negative = left, positive = right)
    const offsetX = perpX * controlPointOffset
    const offsetY = perpY * controlPointOffset
    
    // Calculate control points based on position, with bend offset
    switch (sourcePosition) {
      case Position.Right:
        controlX1 = sourceX + offset + offsetX
        controlY1 = sourceY + offsetY
        break
      case Position.Left:
        controlX1 = sourceX - offset + offsetX
        controlY1 = sourceY + offsetY
        break
      case Position.Top:
        controlX1 = sourceX + offsetX
        controlY1 = sourceY - offset + offsetY
        break
      case Position.Bottom:
      default:
        controlX1 = sourceX + offsetX
        controlY1 = sourceY + offset + offsetY
        break
    }
    
    switch (targetPosition) {
      case Position.Right:
        controlX2 = targetX + offset + offsetX
        controlY2 = targetY + offsetY
        break
      case Position.Left:
        controlX2 = targetX - offset + offsetX
        controlY2 = targetY + offsetY
        break
      case Position.Top:
        controlX2 = targetX + offsetX
        controlY2 = targetY - offset + offsetY
        break
      case Position.Bottom:
      default:
        controlX2 = targetX + offsetX
        controlY2 = targetY + offset + offsetY
        break
    }
  }
  
  // Calculate label position (midpoint of the curve)
  // Approximate midpoint of cubic bezier curve
  const t = 0.5
  const mt = 1 - t
  const labelX = mt * mt * mt * sourceX + 3 * mt * mt * t * controlX1 + 3 * mt * t * t * controlX2 + t * t * t * targetX
  const labelY = mt * mt * mt * sourceY + 3 * mt * mt * t * controlY1 + 3 * mt * t * t * controlY2 + t * t * t * targetY
  
  // Create SVG path for cubic bezier curve
  const path = `M ${sourceX},${sourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${targetX},${targetY}`
  
  return [path, labelX, labelY]
}

/**
 * Custom edge component for Relationship edges.
 * Supports inline editing on double-click.
 * Handles multiple edge types (bezier, smoothstep, step, straight) and styling.
 * 
 * @param sourceX - Source X coordinate
 * @param sourceY - Source Y coordinate
 * @param targetX - Target X coordinate
 * @param targetY - Target Y coordinate
 * @param sourcePosition - Source handle position
 * @param targetPosition - Target handle position
 * @param sourceHandle - Source handle ID
 * @param targetHandle - Target handle ID
 * @param data - Edge data containing relationship information
 * @param selected - Whether the edge is selected
 * @returns The relationship edge component JSX
 */
export const RelationshipEdge = memo(
  ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceHandleId,
    targetHandleId,
    source,
    target,
    data,
    selected,
  }: EdgeProps<RelationshipEdgeData>) => {
    const { updateRelationship } = useRelationshipActions()
    const { getNode, setNodes, flowToScreenPosition } = useReactFlow()
    const nodes = useNodes()
    const relationship = data?.relationship
    const label = relationship?.primaryLabel || ''
    const isEditingPerspective = data?.isEditingPerspective ?? false
    const isInPerspective = data?.isInPerspective ?? true
    const selectedRelationshipId = useUIStore((state) => state.selectedRelationshipId)
    const relationshipEditorOpen = useUIStore((state) => state.relationshipEditorOpen)
    
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
    
    // Extract edge style from metadata
    // Use JSON.stringify to ensure we detect changes to nested metadata
    const metadataKey = relationship?.metadata ? JSON.stringify(relationship.metadata) : ''
    const edgeStyle = useMemo(() => {
      const metadata = relationship?.metadata || {}
      // Theme-aware default edge color (muted foreground color)
      const defaultEdgeColor = isDarkMode ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)'
      const baseColor = (metadata.edgeColor as string) || defaultEdgeColor
      
      // Apply greyed-out styling when editing perspective and relationship is not included
      const isGreyedOut = isEditingPerspective && !isInPerspective
      // Red color when selected
      const selectedColor = '#ef4444'
      let color = selected ? selectedColor : baseColor
      
      if (isGreyedOut) {
        // Theme-aware greyed-out color (muted border color)
        color = isDarkMode ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)'
      }
      
      return {
        type: (metadata.edgeType as 'bezier' | 'smoothstep' | 'step' | 'straight') || 'bezier',
        color,
        style: (metadata.edgeStyle as 'solid' | 'dashed' | 'dotted' | 'long-dash') || 'solid',
        thickness: (metadata.edgeThickness as number) || 2,
        opacity: isGreyedOut ? 0.3 : 1,
      }
    }, [metadataKey, selected, isEditingPerspective, isInPerspective, isDarkMode])
    
    const [isEditing, setIsEditing] = useState(false)
    const [editLabel, setEditLabel] = useState(label)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const hasTriggeredEditRef = useRef(false)

    // Update edit label when relationship changes
    useEffect(() => {
      setEditLabel(label)
    }, [label])

    // Reset the trigger ref when shouldStartEditing becomes false
    useEffect(() => {
      if (!data?.shouldStartEditing) {
        hasTriggeredEditRef.current = false
      }
    }, [data?.shouldStartEditing])

    // Trigger edit mode if shouldStartEditing flag is set (only once per flag cycle)
    useEffect(() => {
      if (data?.shouldStartEditing && !isEditing && !hasTriggeredEditRef.current) {
        hasTriggeredEditRef.current = true
        setIsEditing(true)
        setEditLabel(label)
      }
    }, [data?.shouldStartEditing, isEditing, label])

    // Focus textarea when editing starts
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }, [isEditing])

    // Calculate edge midpoint in screen coordinates for toolbar positioning
    const midpoint = useMemo(() => {
      const midX = (sourceX + targetX) / 2
      const midY = (sourceY + targetY) / 2
      // Convert flow coordinates to screen coordinates
      return flowToScreenPosition({ x: midX, y: midY })
    }, [sourceX, sourceY, targetX, targetY, flowToScreenPosition])

    // Calculate edge path - keep original path ending at center
    // Arrowhead will be rendered separately at boundary intersection
    const { path: edgePath, labelX, labelY, labelOffsetX, labelOffsetY, arrowhead, trimLength, horizontalWidth } = useMemo(() => {
      // Get target node to calculate boundary intersection
      const targetNode = target ? getNode(target) : null
      
      // Calculate path using CENTER coordinates - path ends at center handle
      const params = {
        sourceX,
        sourceY,
        sourcePosition,
        targetX, // Center coordinates
        targetY, // Center coordinates
        targetPosition,
      }
      
      const hasMultipleEdges = data?.hasMultipleEdges ?? false
      const edgeIndex = data?.edgeIndex ?? 0
      
      let basePath: string
      let baseLabelX: number
      let baseLabelY: number
      
      switch (edgeStyle.type) {
        case 'smoothstep':
          {
            // Override positions so the final segment approaches from the correct side
            const { sourcePosition: sPos, targetPosition: tPos } = deriveStepPositions(
              sourceX,
              sourceY,
              targetX,
              targetY
            )
            ;[basePath, baseLabelX, baseLabelY] = getSmoothStepPath({
              ...params,
              sourcePosition: sPos,
              targetPosition: tPos,
            })
          }
          break
        case 'step':
          {
            const { sourcePosition: sPos, targetPosition: tPos } = deriveStepPositions(
              sourceX,
              sourceY,
              targetX,
              targetY
            )
            ;[basePath, baseLabelX, baseLabelY] = getSmoothStepPath({
              ...params,
              sourcePosition: sPos,
              targetPosition: tPos,
              borderRadius: 0,
            } as any)
          }
          break
        case 'straight':
          ;[basePath, baseLabelX, baseLabelY] = getStraightPath(params)
          break
        case 'bezier':
        default:
          if (hasMultipleEdges && edgeStyle.type === 'bezier') {
            ;[basePath, baseLabelX, baseLabelY] = getBezierPathWithOffset(
              sourceX,
              sourceY,
              targetX,
              targetY,
              sourcePosition,
              targetPosition,
              sourceHandleId,
              targetHandleId
            )
          } else {
            ;[basePath, baseLabelX, baseLabelY] = getBezierPath(params)
          }
          break
      }
      
      // Calculate arrowhead position at boundary intersection
      let arrowheadPos: { x: number; y: number; angle: number } | null = null
      let trimLength: number | undefined = undefined
      
      if (targetNode && targetNode.width && targetNode.height) {
        // Use edgeStyle.type to determine if this is a bezier curve
        const isBezierType = edgeStyle.type === 'bezier'
        
        if (isBezierType) {
          // Primary: use the browser's SVG path geometry for robust intersection
          arrowheadPos = findPathBoundaryIntersectionUsingSVG(
            targetX,
            targetY,
            targetNode.width,
            targetNode.height,
            basePath
          ) || null
          if (arrowheadPos) {
            trimLength = (arrowheadPos as any).trimLength as number | undefined
          }

          // Fallback: if geometry API fails (should be rare), fall back to bezier math or line
          if (!arrowheadPos) {
            // Attempt bezier math using parsed control points
            const pathMatch = basePath.match(/M\s*([\d.-]+)\s*,\s*([\d.-]+)\s+C\s*([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)/)
            if (pathMatch) {
              const x0 = parseFloat(pathMatch[1])
              const y0 = parseFloat(pathMatch[2])
              const x1 = parseFloat(pathMatch[3])
              const y1 = parseFloat(pathMatch[4])
              const x2 = parseFloat(pathMatch[5])
              const y2 = parseFloat(pathMatch[6])
              const x3 = parseFloat(pathMatch[7])
              const y3 = parseFloat(pathMatch[8])
              arrowheadPos = findBezierBoundaryIntersection(
                targetX,
                targetY,
                targetNode.width,
                targetNode.height,
                x0, y0, x1, y1, x2, y2, x3, y3
              )
            }
            if (!arrowheadPos) {
              arrowheadPos = getNodeBoundaryIntersection(
                targetX,
                targetY,
                targetNode.width,
                targetNode.height,
                sourceX,
                sourceY
              )
            }
          }
          
          // Do not modify the path geometry; we'll trim the stroke using dasharray instead
        } else {
          // For straight, smoothstep, and step: use robust path-geometry computation first
          const geom = findPathBoundaryIntersectionUsingSVG(
            targetX,
            targetY,
            targetNode.width,
            targetNode.height,
            basePath
          )
          
          if (geom) {
            arrowheadPos = { x: geom.x, y: geom.y, angle: geom.angle }
            if (typeof (geom as any).trimLength === 'number') {
              trimLength = (geom as any).trimLength as number
            }
          } else {
            // Fallback to simple radial intersection if geometry API fails
            arrowheadPos = getNodeBoundaryIntersection(
              targetX,
              targetY,
              targetNode.width,
              targetNode.height,
              sourceX,
              sourceY
            )
          }
        }
      }
      
      let labelOffsetX = 0
      let labelOffsetY = 0

      if (hasMultipleEdges && edgeStyle.type !== 'bezier') {
        const maxHandles = 5
        const offsetAmount = 25
        const offset = (edgeIndex - (maxHandles - 1) / 2) * offsetAmount
        
        const dx = targetX - sourceX
        const dy = targetY - sourceY
        const length = Math.sqrt(dx * dx + dy * dy)
        
        if (length > 0) {
          const perpX = -dy / length
          const perpY = dx / length
          labelOffsetX = perpX * offset
          labelOffsetY = perpY * offset
        }
      }
      
      // Calculate horizontal width for word wrapping (we don't need pathLength anymore)
      const horizontalWidth = getPathHorizontalWidth(basePath)
      
      return {
        path: basePath, // Keep original path ending at center
        labelX: baseLabelX,
        labelY: baseLabelY,
        labelOffsetX,
        labelOffsetY,
        arrowhead: arrowheadPos,
        trimLength,
        horizontalWidth,
      }
    }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, sourceHandleId, targetHandleId, data?.hasMultipleEdges, data?.edgeIndex, edgeStyle.type, source, target, getNode])

    // Determine if word wrapping should be enabled based on text width vs horizontal edge width
    // Only wrap on clearly horizontal edges - vertical and diagonal edges have plenty of space
    // For horizontal edges, wrap when text exceeds 30% of the horizontal bounding box width
    const shouldWordWrap = useMemo(() => {
      if (!label) return false
      
      // If horizontalWidth is not available, fall back to using the distance between nodes
      const effectiveHorizontalWidth = horizontalWidth || Math.abs(targetX - sourceX)
      const effectiveVerticalHeight = Math.abs(targetY - sourceY)
      
      // Only wrap on clearly horizontal edges (horizontal width significantly greater than vertical height)
      // Use a ratio of 2:1 to ensure we only wrap when the edge is clearly horizontal
      // This prevents wrapping on vertical and diagonal edges that have plenty of space
      const isHorizontalEdge = effectiveHorizontalWidth > effectiveVerticalHeight * 2
      
      // Don't wrap vertical or diagonal edges - they have plenty of space
      if (!isHorizontalEdge) return false
      
      // For horizontal edges, check if text width exceeds 30% of horizontal width
      if (!effectiveHorizontalWidth) return false
      
      // Find the longest line (accounting for manual line breaks)
      const lines = label.split('\n')
      const longestLine = lines.reduce((longest, line) => 
        line.length > longest.length ? line : longest, '')
      
      if (!longestLine) return false
      
      // Estimate text width (text-xs is 12px, px-2 adds 8px padding on each side = 16px total)
      const fontSize = 12
      const padding = 16 // px-2 = 0.5rem = 8px on each side
      const estimatedTextWidth = estimateTextWidth(longestLine, fontSize, padding)
      
      // Enable word wrap if text width exceeds 30% of the horizontal width of the edge
      const maxWidth = effectiveHorizontalWidth * 0.3
      return estimatedTextWidth > maxWidth
    }, [label, horizontalWidth, sourceX, targetX, sourceY, targetY])

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsEditing(true)
      setEditLabel(label)
    }

    const handleSave = async () => {
      if (!relationship) return
      
      // Trim each line and remove empty lines, but preserve line breaks
      const cleanedLabel = editLabel
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
      
      if (cleanedLabel && cleanedLabel !== label) {
        try {
          await updateRelationship(relationship.id, {
            primaryLabel: cleanedLabel,
          })
        } catch (error) {
          console.error('Failed to update relationship label:', error)
          setEditLabel(label) // Revert on error
        }
      } else {
        setEditLabel(label) // Revert if empty or unchanged
      }
      setIsEditing(false)
    }

    const handleCancel = () => {
      setEditLabel(label)
      setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && isEditing) {
        // Enter (without Shift) saves and exits edit mode
        e.preventDefault()
        handleSave()
        // After saving, navigate to target node edit mode
        navigateToTargetNode()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      } else if (e.key === 'Tab' && isEditing) {
        e.preventDefault()
        // Save current edit first
        handleSave()
        // Navigate to target node edit mode
        navigateToTargetNode()
      }
      // Shift+Enter allows line breaks (default textarea behavior)
    }

    // Navigate to target node and trigger edit mode
    const navigateToTargetNode = () => {
      if (!target) return
      
      const targetNode = getNode(target)
      if (targetNode && targetNode.data) {
        // Set shouldStartEditing flag on the target node
        const updatedNodes = nodes.map((node) => {
          if (node.id === target && node.data && typeof node.data === 'object') {
            return {
              ...node,
              data: {
                ...(node.data as Record<string, unknown>),
                shouldStartEditing: true,
              },
            }
          }
          return node
        })
        setNodes(updatedNodes)
      }
    }

    return (
      <>
        <BaseEdge
          path={edgePath}
          markerEnd={undefined}
          style={{
            stroke: edgeStyle.color,
            strokeWidth: selected ? Math.max(edgeStyle.thickness, 3) : edgeStyle.thickness,
            // Apply line style if set, otherwise use trimLength for bezier edge trimming
            strokeDasharray:
              edgeStyle.style === 'dashed'
                ? '5,5'
                : edgeStyle.style === 'dotted'
                  ? (() => {
                      const t = selected ? Math.max(edgeStyle.thickness, 3) : edgeStyle.thickness
                      // Pattern: filled dot (0), gap for empty dot (t * 2 to ensure visible gap)
                      // The gap needs to be larger than the dot diameter to create visible space
                      return `0 ${t * 2}`
                    })()
                  : edgeStyle.style === 'long-dash'
                    ? '10,4'
                    : (typeof trimLength === 'number' && trimLength > 0)
                      ? `${trimLength}px 100000px`
                      : undefined,
            strokeLinecap: edgeStyle.style === 'dotted' ? 'round' : undefined,
            strokeDashoffset: 0,
            opacity: edgeStyle.opacity,
          }}
        />
        {/* Custom arrowhead at boundary intersection */}
        {arrowhead && (
          <EdgeLabelRenderer>
            <svg
              style={{
                position: 'absolute',
                overflow: 'visible',
                pointerEvents: 'none',
                left: 0,
                top: 0,
              }}
            >
              <g
                transform={`translate(${arrowhead.x},${arrowhead.y}) rotate(${arrowhead.angle}) translate(-12, -6)`}
              >
                <path
                  d="M 0 0 L 12 6 L 0 12 Z"
                  fill={edgeStyle.color}
                  opacity={edgeStyle.opacity}
                />
              </g>
            </svg>
          </EdgeLabelRenderer>
        )}
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX + labelOffsetX}px,${labelY + labelOffsetY}px)`,
            }}
            className="nodrag nopan absolute pointer-events-auto border-0"
            onDoubleClick={handleDoubleClick}
          >
            {isEditing ? (
              <textarea
                ref={inputRef}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="px-2 py-1 text-xs font-medium rounded shadow-lg outline-none min-w-[80px] text-foreground backdrop-blur-sm bg-[hsl(var(--edge-label-bg))] border-0 text-center resize-none whitespace-pre-wrap"
                onClick={(e) => e.stopPropagation()}
                rows={Math.max(1, editLabel.split('\n').length)}
                style={{ minHeight: '1.5rem', maxHeight: '6rem', overflowY: 'auto' }}
              />
            ) : (
              <div
                className={`px-2 py-1 text-xs font-medium rounded cursor-pointer hover:bg-accent text-foreground border-0 text-center whitespace-pre-line ${
                  shouldWordWrap ? '' : ''
                } ${
                  isEditingPerspective && !isInPerspective ? 'opacity-50' : 'opacity-100'
                } ${
                  selected 
                    ? 'bg-[hsl(var(--edge-label-bg-selected))]' 
                    : 'bg-[hsl(var(--edge-label-bg))]'
                }`}
                style={shouldWordWrap ? { maxWidth: `${(horizontalWidth || Math.abs(targetX - sourceX)) * 0.3}px`, wordWrap: 'break-word', overflowWrap: 'break-word' } : undefined}
              >
                {label}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
        {relationship && selectedRelationshipId === relationship.id && !relationshipEditorOpen && (
          <EdgeToolbar
            midpoint={midpoint}
            visible={true}
            relationship={relationship}
            onEdit={() => {
              // Edge toolbar will handle opening editor
            }}
          />
        )}
      </>
    )
  }
)

RelationshipEdge.displayName = 'RelationshipEdge'

