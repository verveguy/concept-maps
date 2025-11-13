/**
 * Layout selector component with hover slide-out menu.
 * Shows current layout icon and expands to show all layout options on hover.
 */

import React, { useState, useRef, useEffect } from 'react'
import { Network, Layers, GitBranch } from 'lucide-react'
import type { LayoutType } from '@/lib/layouts'

/**
 * Layout option configuration.
 */
interface LayoutOption {
  id: LayoutType
  icon: React.ComponentType<{ className?: string }>
  title: string
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'force-directed',
    icon: Network,
    title: 'Force-Directed Layout\nSpreads nodes evenly using physics simulation',
  },
  {
    id: 'hierarchical',
    icon: Layers,
    title: 'Hierarchical Layout\nTop-to-bottom tree structure',
  },
  {
    id: 'layered',
    icon: GitBranch,
    title: 'Layered Layout (Sugiyama)\nMinimizes edge crossings, handles cycles',
  },
]

/**
 * Props for LayoutSelector component.
 */
export interface LayoutSelectorProps {
  /** Currently selected layout (shown on main button) */
  selectedLayout: LayoutType
  /** Callback when layout is selected (just changes selection) */
  onSelectLayout: (layout: LayoutType) => void
  /** Callback when layout button is clicked (applies layout) */
  onApplyLayout: (layout: LayoutType) => void
  /** Whether controls are disabled */
  disabled?: boolean
}

/**
 * Layout selector with hover slide-out menu.
 * 
 * Shows a single button with the current layout icon. On hover, slides out
 * a horizontal menu with all layout options. Clicking an option selects it,
 * clicking the main button applies the selected layout.
 * 
 * @param props - Component props
 * @returns The layout selector JSX
 */
export function LayoutSelector({
  selectedLayout,
  onSelectLayout,
  onApplyLayout,
  disabled = false,
}: LayoutSelectorProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isMenuHovered, setIsMenuHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)

  // Find the selected layout option
  const selectedOption = LAYOUT_OPTIONS.find((opt) => opt.id === selectedLayout) || LAYOUT_OPTIONS[0]
  const SelectedIcon = selectedOption.icon

  // Show menu when hovering over button or menu
  const showMenu = isHovered || isMenuHovered

  // Handle mouse enter/leave with minimal delay for better responsiveness
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsHovered(true)
  }

  const handleMouseLeave = (event: React.MouseEvent) => {
    // Check if mouse is moving to menu (to the right)
    const relatedTarget = event.relatedTarget as HTMLElement
    if (relatedTarget && containerRef.current?.contains(relatedTarget)) {
      // Mouse is moving to menu, don't hide
      return
    }
    // Shorter delay and only hide if not hovering menu
    timeoutRef.current = setTimeout(() => {
      if (!isMenuHovered) {
        setIsHovered(false)
      }
    }, 100) // Increased delay slightly to allow movement to menu
  }

  const handleMenuMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsMenuHovered(true)
    setIsHovered(true) // Keep main button hovered when menu is hovered
  }

  const handleMenuMouseLeave = () => {
    setIsMenuHovered(false)
    // Small delay before hiding to allow moving back to button
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 100)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Handle layout option click
  const handleOptionClick = async (layoutId: LayoutType, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      // Apply layout first, then update selection only on success
      await onApplyLayout(layoutId)
      onSelectLayout(layoutId)
    } catch (error) {
      // If layout application fails, don't update selection to keep UI consistent
      console.error('Failed to apply layout:', error)
    }
    setIsHovered(false)
    setIsMenuHovered(false)
  }

  // Handle main button click
  const handleMainButtonClick = () => {
    if (disabled) return
    onApplyLayout(selectedLayout)
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main layout button */}
      <button
        onClick={handleMainButtonClick}
        disabled={disabled}
        className="react-flow__controls-button"
        // Remove title to prevent tooltip interference with hover
      >
        <SelectedIcon className="h-4 w-4" />
      </button>

      {/* Invisible bridge area - always present to catch hover when moving from right */}
      <div
        className="absolute left-full top-0 w-4 h-full"
        onMouseEnter={handleMenuMouseEnter}
        style={{ zIndex: 998 }}
      />

      {/* Slide-out menu - styled to match vertical controls */}
      <div
        className={`absolute left-full top-0 flex items-center bg-card border shadow-lg transition-all duration-150 ease-out ${
          showMenu
            ? 'opacity-100 translate-x-0 pointer-events-auto'
            : 'opacity-0 -translate-x-2 pointer-events-none'
        }`}
        onMouseEnter={handleMenuMouseEnter}
        onMouseLeave={handleMenuMouseLeave}
        style={{
          zIndex: 1000,
          // Position menu directly adjacent to button with no gap
          marginLeft: '0px',
        }}
      >
        {LAYOUT_OPTIONS.map((option) => {
          const OptionIcon = option.icon
          const isSelected = option.id === selectedLayout

          return (
            <button
              key={option.id}
              onClick={(e) => handleOptionClick(option.id, e)}
              disabled={disabled}
              className={`react-flow__controls-button ${
                isSelected ? '!bg-primary !text-primary-foreground' : ''
              }`}
              title={option.title}
            >
              <OptionIcon className="h-4 w-4" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

