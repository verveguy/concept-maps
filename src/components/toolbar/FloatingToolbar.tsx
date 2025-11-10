/**
 * Generalized floating toolbar component.
 * 
 * Handles positioning and rendering of a floating toolbar that can be positioned
 * relative to a node element or a midpoint coordinate.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface FloatingToolbarProps {
  /** Whether the toolbar should be visible */
  visible: boolean
  /** Node element ref for positioning (alternative to midpoint) */
  nodeRef?: React.RefObject<HTMLDivElement>
  /** Midpoint position in screen coordinates (alternative to nodeRef) */
  midpoint?: { x: number; y: number }
  /** Children to render inside the toolbar */
  children: React.ReactNode
  /** Callback when clicking outside the toolbar */
  onDismiss?: () => void
  /** Additional CSS classes */
  className?: string
}

export function FloatingToolbar({
  visible,
  nodeRef,
  midpoint,
  children,
  onDismiss,
  className = '',
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
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

  // Calculate toolbar position
  useEffect(() => {
    if (!visible || !toolbarRef.current) {
      return
    }

    const updatePosition = () => {
      const toolbarElement = toolbarRef.current
      if (!toolbarElement) return

      const toolbarRect = toolbarElement.getBoundingClientRect()
      const toolbarHeight = toolbarRect.height || 60
      const toolbarWidth = toolbarRect.width || 350
      const spacing = 12 // Gap between toolbar and target
      const topBuffer = 20 // Extra buffer from top edge before flipping
      const sideBuffer = 16 // Buffer from left/right edges when constraining

      let targetX: number
      let targetTop: number
      let targetBottom: number

      if (nodeRef?.current) {
        // Position relative to node
        const nodeRect = nodeRef.current.getBoundingClientRect()
        if (nodeRect.width === 0 || nodeRect.height === 0) {
          // Node not ready yet, retry
          requestAnimationFrame(updatePosition)
          return
        }
        targetX = nodeRect.left + nodeRect.width / 2
        targetTop = nodeRect.top
        targetBottom = nodeRect.bottom
      } else if (midpoint) {
        // Position relative to midpoint
        targetX = midpoint.x
        targetTop = midpoint.y
        targetBottom = midpoint.y
      } else {
        return // No positioning reference
      }

      // Find React Flow canvas container by ID
      const reactFlowContainer = document.getElementById('concept-map-canvas')
      
      let canvasTop = 0
      let canvasLeft = 0
      let canvasRight = window.innerWidth
      
      if (reactFlowContainer) {
        const containerRect = reactFlowContainer.getBoundingClientRect()
        canvasTop = containerRect.top
        canvasLeft = containerRect.left
        canvasRight = containerRect.right
      }

      // Calculate available space above and below within canvas bounds
      const spaceAbove = targetTop - canvasTop
      const requiredSpaceAbove = toolbarHeight + spacing + topBuffer
      
      // Determine placement: above if enough space (including buffer), otherwise below
      const placement = spaceAbove >= requiredSpaceAbove ? 'above' : 'below'

      // Calculate horizontal position (centered, constrained to canvas bounds with side buffers)
      const toolbarHalfWidth = toolbarWidth / 2
      let left = targetX
      if (targetX - toolbarHalfWidth < canvasLeft + sideBuffer) {
        left = canvasLeft + toolbarHalfWidth + sideBuffer
      } else if (targetX + toolbarHalfWidth > canvasRight - sideBuffer) {
        left = canvasRight - toolbarHalfWidth - sideBuffer
      }

      // Calculate vertical position
      let top: number
      if (placement === 'above') {
        top = targetTop - toolbarHeight - spacing
      } else {
        top = targetBottom + spacing
      }
      
      // Ensure toolbar stays visible within viewport
      const clampedTop = Math.max(0, Math.min(window.innerHeight - toolbarHeight, top))
      
      // Apply positioning
      toolbarElement.style.position = 'fixed'
      toolbarElement.style.left = `${left}px`
      toolbarElement.style.top = `${clampedTop}px`
      toolbarElement.style.transform = 'translateX(-50%)'
    }

    // Initial position calculation
    requestAnimationFrame(updatePosition)

    // Update on window resize and React Flow viewport changes
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition)
    }
    window.addEventListener('resize', handleUpdate)

    // Poll for React Flow viewport changes (zoom/pan)
    const intervalId = setInterval(() => {
      if (visible && toolbarRef.current) {
        if (nodeRef?.current || midpoint) {
          updatePosition()
        }
      }
    }, 50) // Update every 50ms for smoother tracking

    return () => {
      window.removeEventListener('resize', handleUpdate)
      clearInterval(intervalId)
    }
  }, [visible, nodeRef, midpoint])

  // Handle clicks outside to close
  useEffect(() => {
    if (!visible || !onDismiss) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      // Check if click is inside toolbar
      if (toolbarRef.current && toolbarRef.current.contains(target)) {
        return
      }
      
      // Check if click is inside node (if using nodeRef)
      if (nodeRef?.current && nodeRef.current.contains(target)) {
        return
      }
      
      // Check if click is inside any Radix UI popover/select content
      // Radix portals render content outside normal DOM, so we traverse up
      // and check for Radix-specific attributes
      let current: Element | null = target
      while (current && current !== document.body) {
        // Check for Radix data attributes or portal containers
        if (
          current.hasAttribute('data-state') ||
          current.hasAttribute('data-radix-portal') ||
          current.getAttribute('role') === 'dialog' ||
          current.classList.contains('radix-popover-content')
        ) {
          return // Click is inside a popover/select - don't dismiss
        }
        current = current.parentElement
      }
      
      // Also check if target is inside a Radix portal container
      if (target.closest('[data-radix-portal]')) {
        return
      }
      
      // Click is outside toolbar, node, and popovers - dismiss toolbar
      onDismiss()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [visible, onDismiss, nodeRef])

  if (!visible) {
    return null
  }

  return createPortal(
    <div
      ref={toolbarRef}
      className={`fixed z-[100] pointer-events-auto bg-popover rounded-lg shadow-md border dark:shadow-[0_4px_12px_rgba(255,255,255,0.2)] dark:border dark:border-white/20 px-2 py-1.5 flex items-center gap-1 transition-opacity duration-100 ${className}`}
      style={{
        transform: 'translateX(-50%)',
        // Initially position off-screen until calculated
        left: '-9999px',
        top: '-9999px',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgb(229, 231, 235)', // gray-200 for light mode, white/20 for dark mode
        borderWidth: '1px',
        borderStyle: 'solid',
        boxShadow: isDarkMode 
          ? '0 4px 12px rgba(255, 255, 255, 0.2)' 
          : '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)', // More visible shadow for light mode
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  )
}
