/**
 * Shared line settings dropdown component.
 * Can be used for both edges (with type) and nodes (without type).
 */

import { useState, useEffect } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EdgeTypeIcon } from './EdgeToolbar'

interface LineSettingsDropdownProps {
  /** Line style (solid, dashed, dotted, long-dash) */
  style: 'solid' | 'dashed' | 'dotted' | 'long-dash'
  /** Line thickness (1-8) */
  thickness: number
  /** Line type - only used for edges, undefined for nodes */
  type?: 'bezier' | 'smoothstep' | 'step' | 'straight'
  /** Callback when style changes */
  onStyleChange: (style: 'solid' | 'dashed' | 'dotted' | 'long-dash') => void
  /** Callback when thickness changes */
  onThicknessChange: (thickness: number) => void
  /** Callback when type changes - only used for edges */
  onTypeChange?: (type: 'bezier' | 'smoothstep' | 'step' | 'straight') => void
  /** Whether the control is disabled */
  disabled?: boolean
  /** Title for the button */
  title?: string
}

/**
 * Unified line settings dropdown (Miro-style)
 * Combines line style and thickness in one panel
 * Optionally includes line type for edges
 */
export function LineSettingsDropdown({
  style,
  thickness,
  type,
  onStyleChange,
  onThicknessChange,
  onTypeChange,
  disabled,
  title = 'Line settings',
}: LineSettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
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
  
  // Fixed thickness for shape icons (don't reflect actual thickness)
  const iconThickness = 2
  
  // Theme-aware colors
  const sliderColor = isDarkMode ? '#f3f4f6' : '#111827' // gray-100 in dark mode, gray-900 in light mode
  const borderColor = isDarkMode ? '#f3f4f6' : '#111827' // gray-100 in dark mode, gray-900 in light mode

  // Determine what icon to show in the button
  const getButtonIcon = () => {
    if (type !== undefined) {
      // For edges, show the edge type icon with current style
      return <EdgeTypeIcon type={type} style={style} thickness={iconThickness} />
    } else {
      // For nodes, show a simple line with current style
      if (style === 'solid') {
        return <div className="h-0.5 w-6 border-t-2 border-gray-900 dark:border-gray-100" />
      } else if (style === 'dashed') {
        return <div className="h-0.5 w-6 border-t-2 border-dashed border-gray-900 dark:border-gray-100" />
      } else if (style === 'dotted') {
        return <div className="h-0.5 w-6 border-t-2 border-dotted border-gray-900 dark:border-gray-100" />
      } else {
        // long-dash
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <path
              d="M4 12 L20 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="8 3"
              strokeLinecap="round"
              className="text-gray-900 dark:text-gray-100"
            />
          </svg>
        )
      }
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <IconButton
          disabled={disabled}
          className="h-8 w-8 p-0 [&_svg]:size-auto!"
          title={title}
        >
          <div className="flex items-center justify-center w-full h-full">
            {getButtonIcon()}
          </div>
        </IconButton>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5" align="start">
        <div className="space-y-1.5">
          {/* Thickness Slider - Miro style with dots */}
          <div className="relative flex items-center gap-1">
            <div className="relative h-4 flex items-center" style={{ width: '120px' }}>
              {/* Background line */}
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px" style={{ backgroundColor: sliderColor }}></div>
              </div>
              {/* Dots at each integer position */}
              <div className="absolute inset-0 flex items-center">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full absolute"
                    style={{
                      backgroundColor: sliderColor,
                      left: `calc(1.5px + ${(i / 7) * 100}% - ${(i / 7) * 4}px - 2px)`,
                    }}
                  />
                ))}
              </div>
              {/* Thumb indicator - centered on dot markers */}
              <div
                className="absolute w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: sliderColor,
                  left: `calc(2px + ${((thickness - 1) / 7) * 100}% - ${((thickness - 1) / 7) * 4}px - 4px)`,
                }}
              />
              {/* Slider track (invisible but interactive) */}
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={thickness}
                onChange={(e) => onThicknessChange(parseInt(e.target.value))}
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                style={{
                  background: 'transparent',
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-3 text-right">{thickness}</span>
          </div>

          {/* Line Shapes - only show for edges (when type is defined) */}
          {type !== undefined && onTypeChange && (
            <div className="grid grid-cols-4 gap-0.5">
              <button
                onClick={() => onTypeChange('straight')}
                disabled={disabled}
                className={`w-7 h-7 rounded transition-colors flex items-center justify-center text-gray-900 dark:text-gray-100 ${
                  type === 'straight'
                    ? 'bg-accent'
                    : 'hover:bg-accent/50'
                }`}
                title="Straight"
              >
                <EdgeTypeIcon type="straight" style="solid" thickness={iconThickness} />
              </button>
              <button
                onClick={() => onTypeChange('step')}
                disabled={disabled}
                className={`w-7 h-7 rounded transition-colors flex items-center justify-center text-gray-900 dark:text-gray-100 ${
                  type === 'step'
                    ? 'bg-accent'
                    : 'hover:bg-accent/50'
                }`}
                title="Step"
              >
                <EdgeTypeIcon type="step" style="solid" thickness={iconThickness} />
              </button>
              <button
                onClick={() => onTypeChange('smoothstep')}
                disabled={disabled}
                className={`w-7 h-7 rounded transition-colors flex items-center justify-center text-gray-900 dark:text-gray-100 ${
                  type === 'smoothstep'
                    ? 'bg-accent'
                    : 'hover:bg-accent/50'
                }`}
                title="Smooth Step"
              >
                <EdgeTypeIcon type="smoothstep" style="solid" thickness={iconThickness} />
              </button>
              <button
                onClick={() => onTypeChange('bezier')}
                disabled={disabled}
                className={`w-7 h-7 rounded transition-colors flex items-center justify-center text-gray-900 dark:text-gray-100 ${
                  type === 'bezier'
                    ? 'bg-accent'
                    : 'hover:bg-accent/50'
                }`}
                title="Bezier"
              >
                <EdgeTypeIcon type="bezier" style="solid" thickness={iconThickness} />
              </button>
            </div>
          )}

          {/* Line Patterns - no labels, no borders, square buttons */}
          <div className="grid grid-cols-4 gap-0.5">
            <button
              onClick={() => onStyleChange('solid')}
              disabled={disabled}
              className={`w-7 h-7 rounded transition-colors flex items-center justify-center ${
                style === 'solid'
                  ? 'bg-accent'
                  : 'hover:bg-accent/50'
              }`}
              title="Solid"
            >
              <div className="h-0.5 w-6 border-t-2" style={{ borderColor: borderColor }} />
            </button>
            <button
              onClick={() => onStyleChange('long-dash')}
              disabled={disabled}
              className={`w-7 h-7 rounded transition-colors flex items-center justify-center ${
                style === 'long-dash'
                  ? 'bg-accent'
                  : 'hover:bg-accent/50'
              }`}
              title="Long Dash"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path
                  d="M4 12 L20 12"
                  stroke={borderColor}
                  strokeWidth="2"
                  strokeDasharray="8 3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              onClick={() => onStyleChange('dashed')}
              disabled={disabled}
              className={`w-7 h-7 rounded transition-colors flex items-center justify-center ${
                style === 'dashed'
                  ? 'bg-accent'
                  : 'hover:bg-accent/50'
              }`}
              title="Dashed"
            >
              <div className="h-0.5 w-6 border-t-2 border-dashed" style={{ borderColor: borderColor }} />
            </button>
            <button
              onClick={() => onStyleChange('dotted')}
              disabled={disabled}
              className={`w-7 h-7 rounded transition-colors flex items-center justify-center ${
                style === 'dotted'
                  ? 'bg-accent'
                  : 'hover:bg-accent/50'
              }`}
              title="Dotted"
            >
              <div className="h-0.5 w-6 border-t-2 border-dotted" style={{ borderColor: borderColor }} />
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

