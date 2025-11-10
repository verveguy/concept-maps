/**
 * Toolbar component for nodes (concepts and comments).
 * 
 * Renders a floating toolbar above or below the node when selected.
 * Handles its own positioning relative to the node element.
 */

import { useState, useEffect } from 'react'
import { Pencil, Check, Trash2, Circle } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useConceptActions } from '@/hooks/useConceptActions'
import { useCommentActions } from '@/hooks/useCommentActions'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { useUndoStore } from '@/stores/undoStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FloatingToolbar } from './FloatingToolbar'
import { LineSettingsDropdown } from './LineSettingsDropdown'

/**
 * Icon-only color picker button component (Miro-style)
 */
function ColorPickerIcon({
  type,
  value,
  onChange,
  disabled,
}: {
  type: 'fill' | 'border' | 'text'
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [hexValue, setHexValue] = useState(value)
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    setHexValue(value)
  }, [value])

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

  const handleColorChange = (newColor: string) => {
    setHexValue(newColor)
    onChange(newColor)
  }

  const handleHexBlur = () => {
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
      onChange(hexValue)
    } else {
      setHexValue(value) // Revert on invalid
    }
  }

  /**
   * Check if a color value represents transparency
   */
  const isTransparent = (color: string): boolean => {
    if (!color) return true
    const normalized = color.trim().toLowerCase()
    
    // Check for 'transparent' keyword
    if (normalized === 'transparent') return true
    
    // Check for rgba/hsla with alpha < 1
    const rgbaMatch = normalized.match(/rgba?\(([^)]+)\)/)
    if (rgbaMatch) {
      const values = rgbaMatch[1].split(',').map(v => parseFloat(v.trim()))
      if (values.length === 4 && values[3] < 1) return true
    }
    
    const hslaMatch = normalized.match(/hsla?\(([^)]+)\)/)
    if (hslaMatch) {
      const values = hslaMatch[1].split(',').map(v => parseFloat(v.trim()))
      if (values.length === 4 && values[3] < 1) return true
    }
    
    // Check for hex with alpha channel (#rrggbbaa where aa is 00)
    if (normalized.match(/^#[0-9a-f]{8}$/)) {
      const alpha = parseInt(normalized.slice(7, 9), 16)
      if (alpha < 255) return true
    }
    
    return false
  }

  /**
   * Calculate relative luminance of a color (0-1)
   * Returns a value between 0 (dark) and 1 (light)
   */
  const getLuminance = (color: string): number => {
    if (!color) return 0
    
    // Convert color to RGB
    let r = 0, g = 0, b = 0
    
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16)
        g = parseInt(hex[1] + hex[1], 16)
        b = parseInt(hex[2] + hex[2], 16)
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16)
        g = parseInt(hex.slice(2, 4), 16)
        b = parseInt(hex.slice(4, 6), 16)
      }
    }
    // Handle rgb/rgba colors
    else if (color.startsWith('rgb')) {
      const match = color.match(/rgba?\(([^)]+)\)/)
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()))
        r = values[0] || 0
        g = values[1] || 0
        b = values[2] || 0
      }
    }
    // Handle hsl/hsla colors - convert to RGB
    else if (color.startsWith('hsl')) {
      const match = color.match(/hsla?\(([^)]+)\)/)
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()))
        const h = values[0] || 0
        const s = (values[1] || 0) / 100
        const l = (values[2] || 0) / 100
        
        const c = (1 - Math.abs(2 * l - 1)) * s
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
        const m = l - c / 2
        
        let rTemp = 0, gTemp = 0, bTemp = 0
        if (h < 60) {
          rTemp = c; gTemp = x; bTemp = 0
        } else if (h < 120) {
          rTemp = x; gTemp = c; bTemp = 0
        } else if (h < 180) {
          rTemp = 0; gTemp = c; bTemp = x
        } else if (h < 240) {
          rTemp = 0; gTemp = x; bTemp = c
        } else if (h < 300) {
          rTemp = x; gTemp = 0; bTemp = c
        } else {
          rTemp = c; gTemp = 0; bTemp = x
        }
        
        r = Math.round((rTemp + m) * 255)
        g = Math.round((gTemp + m) * 255)
        b = Math.round((bTemp + m) * 255)
      }
    }
    
    // Calculate relative luminance using WCAG formula
    const [rs, gs, bs] = [r, g, b].map(val => {
      val = val / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  /**
   * Check if we need contrast borders for a color
   * Returns true if the color is too similar to the background
   */
  const needsContrastBorder = (color: string, isDarkMode: boolean): boolean => {
    if (isTransparent(color)) return false
    
    const luminance = getLuminance(color)
    // In light mode, need border if color is very light (luminance > 0.9)
    // In dark mode, need border if color is very dark (luminance < 0.1)
    return isDarkMode ? luminance < 0.1 : luminance > 0.9
  }

  const getIcon = () => {
    if (type === 'fill') {
      // Filled circle for fill color, or checkerboard pattern if transparent
      const transparent = isTransparent(value)
      const needsBorder = needsContrastBorder(value, isDarkMode)
      
      return (
        <div className="relative flex items-center justify-center w-full h-full">
          {transparent ? (
            // Checkerboard pattern for transparent fill
            <div className="relative h-6 w-6 rounded-full overflow-hidden">
              {/* Checkerboard background */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #d1d5db 25%, transparent 25%),
                    linear-gradient(-45deg, #d1d5db 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #d1d5db 75%),
                    linear-gradient(-45deg, transparent 75%, #d1d5db 75%)
                  `,
                  backgroundSize: '4px 4px',
                  backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px',
                }}
              />
              {/* Circle border */}
              <Circle className="h-6 w-6 absolute inset-0" fill="none" stroke="#9ca3af" strokeWidth={1.5} />
            </div>
          ) : needsBorder ? (
            // Fill color with contrast border - use SVG for perfect centering
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              className="w-full h-full"
              style={{ display: 'block' }}
            >
              {/* Contrast border circle - centered at (12, 12) */}
              <circle
                cx="12"
                cy="12"
                r="11"
                fill="none"
                stroke={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
                strokeWidth="1"
              />
              {/* Filled circle with color - centered at (12, 12) */}
              <circle
                cx="12"
                cy="12"
                r="10"
                fill={value}
                stroke={value}
              />
            </svg>
          ) : (
            <Circle className="h-6 w-6" fill={value} stroke={value} />
          )}
        </div>
      )
    } else if (type === 'border') {
      // Circle with border color - add contrast borders if needed
      const needsBorder = needsContrastBorder(value, isDarkMode)
      return (
        <div className="relative flex items-center justify-center w-full h-full">
          {needsBorder ? (
            // Donut-style contrast borders (inner and outer) - all centered at same point
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              className="w-full h-full"
              style={{ display: 'block' }}
            >
              {/* Outer contrast border - centered at (12, 12) */}
              <circle
                cx="12"
                cy="12"
                r="11"
                fill="none"
                stroke={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
                strokeWidth="1"
              />
              {/* Main border color - centered at (12, 12) */}
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke={value}
                strokeWidth="2.5"
              />
              {/* Inner contrast border - centered at (12, 12), radius reduced by main circle strokeWidth (2.5) */}
              <circle
                cx="12"
                cy="12"
                r="7.75"
                fill="none"
                stroke={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
                strokeWidth="1"
              />
            </svg>
          ) : (
            <Circle className="h-6 w-6" fill="none" stroke={value} strokeWidth={2.5} />
          )}
        </div>
      )
    } else {
      // Text: A icon with colored bar underneath - add contrast border if needed
      const needsBorder = needsContrastBorder(value, isDarkMode)
      return (
        <div className="relative flex flex-col items-center">
          <span className="text-base font-semibold leading-none text-foreground">A</span>
          <div className="relative">
            <div
              className="h-1 w-5 rounded-sm mt-0.5"
              style={{ backgroundColor: value }}
            />
            {needsBorder && (
              <div
                className="absolute inset-0 h-1 w-5 rounded-sm mt-0.5 border"
                style={{ 
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                  borderWidth: '1px',
                }}
              />
            )}
          </div>
        </div>
      )
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-8 w-8 p-0 hover:bg-accent [&_svg]:size-auto!"
          title={type === 'fill' ? 'Fill color' : type === 'border' ? 'Border color' : 'Text color'}
        >
          {getIcon()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="flex gap-2">
          <div className="relative h-8 w-12 rounded overflow-hidden" style={{ backgroundColor: value }}>
            <Input
              type="color"
              value={value}
              onChange={(e) => handleColorChange(e.target.value)}
              className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 opacity-0"
              style={{
                WebkitAppearance: 'none',
                appearance: 'none',
              }}
              disabled={disabled}
            />
          </div>
          <Input
            type="text"
            value={hexValue}
            onChange={(e) => setHexValue(e.target.value)}
            onBlur={handleHexBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            placeholder="#ffffff"
            disabled={disabled}
            className="flex-1 h-8 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface NodeToolbarProps {
  /** Node element ref for positioning */
  nodeRef: React.RefObject<HTMLDivElement>
  /** Whether the toolbar should be visible */
  visible: boolean
  /** Type of node ('concept' | 'comment') */
  type: 'concept' | 'comment'
  /** Concept data (if type is 'concept') */
  concept?: {
    id: string
    metadata?: Record<string, unknown>
  }
  /** Comment data (if type is 'comment') */
  comment?: {
    id: string
    resolved?: boolean
  }
  /** Callback when edit button is clicked */
  onEdit?: () => void
}

export function NodeToolbar({
  nodeRef,
  visible,
  type,
  concept,
  comment,
  onEdit,
}: NodeToolbarProps) {
  const { hasWriteAccess } = useMapPermissions()
  const { updateConcept, deleteConcept } = useConceptActions()
  const { resolveComment, unresolveComment, deleteComment } = useCommentActions()
  const setConceptEditorOpen = useUIStore((state) => state.setConceptEditorOpen)
  const setSelectedCommentId = useUIStore((state) => state.setSelectedCommentId)
  const setSelectedConceptId = useUIStore((state) => state.setSelectedConceptId)
  const recordDeletion = useUndoStore((state) => state.recordDeletion)

  // Get current style values
  const [fillColor, setFillColor] = useState<string>('#ffffff')
  const [borderColor, setBorderColor] = useState<string>('#d1d5db')
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted' | 'long-dash'>('solid')
  const [borderThickness, setBorderThickness] = useState<number>(2)
  const [textColor, setTextColor] = useState<string>('#111827')

  // Update local state when concept changes
  useEffect(() => {
    if (concept) {
      const metadata = concept.metadata || {}
      const fill = (metadata.fillColor as string) || '#ffffff'
      const border = (metadata.borderColor as string) || '#d1d5db'
      const style = (metadata.borderStyle as 'solid' | 'dashed' | 'dotted' | 'long-dash') || 'solid'
      const thickness = (metadata.borderThickness as number) || 2
      const text = (metadata.textColor as string) || '#111827'
      setFillColor(fill)
      setBorderColor(border)
      setBorderStyle(style)
      setBorderThickness(thickness)
      setTextColor(text)
    }
  }, [concept])

  const handleDismiss = () => {
    if (type === 'concept' && concept) {
      setSelectedConceptId(null)
    } else if (type === 'comment' && comment) {
      setSelectedCommentId(null)
    }
  }

  const handleConceptStyleUpdate = async (updates: {
    fillColor?: string
    borderColor?: string
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'long-dash'
    borderThickness?: number
    textColor?: string
  }) => {
    if (!concept || !hasWriteAccess) return

    const currentMetadata = concept.metadata || {}
    const newMetadata = {
      ...currentMetadata,
      ...updates,
    }

    try {
      await updateConcept(concept.id, { metadata: newMetadata })
    } catch (error) {
      console.error('Failed to update concept style:', error)
    }
  }

  const handleEditClick = () => {
    if (onEdit) {
      onEdit()
    } else if (type === 'concept' && concept) {
      setConceptEditorOpen(true)
      // Keep selectedConceptId so UnifiedEditor knows which concept to edit
    }
  }

  const handleResolveClick = async () => {
    if (!comment || !hasWriteAccess) return
    try {
      if (comment.resolved) {
        await unresolveComment(comment.id)
      } else {
        await resolveComment(comment.id)
      }
    } catch (error) {
      console.error('Failed to toggle comment resolution:', error)
    }
  }

  const handleDeleteClick = async () => {
    if (!comment || !hasWriteAccess) return
    if (!confirm(`Are you sure you want to delete this comment?`)) return
    try {
      recordDeletion('comment', comment.id)
      await deleteComment(comment.id)
      setSelectedCommentId(null)
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  const handleConceptDeleteClick = async () => {
    if (!concept || !hasWriteAccess) return
    if (!confirm(`Are you sure you want to delete this concept?`)) return
    try {
      recordDeletion('concept', concept.id)
      await deleteConcept(concept.id)
      setSelectedConceptId(null)
    } catch (error) {
      console.error('Failed to delete concept:', error)
    }
  }

  return (
    <FloatingToolbar
      visible={visible}
      nodeRef={nodeRef}
      onDismiss={handleDismiss}
    >
      {type === 'concept' && concept && (
        <>
          <ColorPickerIcon
            type="fill"
            value={fillColor}
            onChange={(color) => {
              setFillColor(color)
              handleConceptStyleUpdate({ fillColor: color })
            }}
            disabled={!hasWriteAccess}
          />
          <ColorPickerIcon
            type="border"
            value={borderColor}
            onChange={(color) => {
              setBorderColor(color)
              handleConceptStyleUpdate({ borderColor: color })
            }}
            disabled={!hasWriteAccess}
          />
          <LineSettingsDropdown
            style={borderStyle}
            thickness={borderThickness}
            onStyleChange={(style) => {
              setBorderStyle(style)
              handleConceptStyleUpdate({ borderStyle: style })
            }}
            onThicknessChange={(thickness) => {
              setBorderThickness(thickness)
              handleConceptStyleUpdate({ borderThickness: thickness })
            }}
            disabled={!hasWriteAccess}
            title="Border settings"
          />
          <ColorPickerIcon
            type="text"
            value={textColor}
            onChange={(color) => {
              setTextColor(color)
              handleConceptStyleUpdate({ textColor: color })
            }}
            disabled={!hasWriteAccess}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEditClick}
            disabled={!hasWriteAccess}
            className="h-8 w-8 p-0 hover:bg-accent [&_svg]:size-auto!"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleConceptDeleteClick}
            disabled={!hasWriteAccess}
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 [&_svg]:size-auto!"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}

      {type === 'comment' && comment && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEditClick}
            disabled={!hasWriteAccess}
            className="h-8 w-8 p-0 hover:bg-accent [&_svg]:size-auto!"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResolveClick}
            disabled={!hasWriteAccess}
            className={`h-8 w-8 p-0 hover:bg-accent [&_svg]:size-auto! ${
              comment.resolved
                ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950'
                : ''
            }`}
            title={comment.resolved ? 'Resolved' : 'Resolve'}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteClick}
            disabled={!hasWriteAccess}
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 [&_svg]:size-auto!"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </FloatingToolbar>
  )
}
