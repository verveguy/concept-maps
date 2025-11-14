/**
 * Toolbar component for edges (relationships).
 * 
 * Renders a floating toolbar near the edge when selected.
 * Handles its own positioning relative to the edge midpoint.
 */

import { useState, useEffect } from 'react'
import { Pencil, Trash2, ArrowLeftRight } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'
import { useCanvasMutations } from '@/hooks/useCanvasMutations'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { useUndoStore } from '@/stores/undoStore'
import { useRelationships } from '@/hooks/useRelationships'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FloatingToolbar } from './FloatingToolbar'
import { LineSettingsDropdown } from './LineSettingsDropdown'

/**
 * Icon-only color picker button for edge color (Miro-style)
 */
function EdgeColorPickerIcon({
  value,
  onChange,
  disabled,
}: {
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
    const luminance = getLuminance(color)
    // In light mode, need border if color is very light (luminance > 0.9)
    // In dark mode, need border if color is very dark (luminance < 0.1)
    return isDarkMode ? luminance < 0.1 : luminance > 0.9
  }

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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <IconButton
          disabled={disabled}
          className="h-8 w-8 p-0 [&_svg]:size-auto!"
          title="Edge color"
        >
          {/* Horizontal line icon showing edge color - match dropdown style but larger */}
          <div className="relative flex items-center justify-center w-full h-full">
            {needsContrastBorder(value, isDarkMode) ? (
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 32 32" 
                className="w-full h-full"
                style={{ display: 'block' }}
              >
                {/* Outer contrast circle - centered at (16, 16) */}
                <circle
                  cx="16"
                  cy="16"
                  r="15"
                  fill="none"
                  stroke={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
                  strokeWidth="1"
                />
                {/* Colored line (horizontal line in center) - centered at y=16 */}
                <line
                  x1="4"
                  y1="16"
                  x2="28"
                  y2="16"
                  stroke={value}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                {/* Inner contrast circle - centered at (16, 16), radius reduced by line thickness (4/2 = 2 on each side) */}
                <circle
                  cx="16"
                  cy="16"
                  r="11"
                  fill="none"
                  stroke={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
                  strokeWidth="1"
                />
              </svg>
            ) : (
              <div className="h-0.5 w-7 border-t-2" style={{ borderColor: value }} />
            )}
          </div>
        </IconButton>
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
            placeholder="#6366f1"
            disabled={disabled}
            className="flex-1 h-8 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Edge type icon component
 */
export function EdgeTypeIcon({ 
  type, 
  style, 
  thickness = 2,
  size = 24
}: { 
  type: 'bezier' | 'smoothstep' | 'step' | 'straight'
  style: 'solid' | 'dashed' | 'dotted' | 'long-dash'
  thickness?: number
  size?: number
}) {
  // Scale strokeWidth proportionally with icon size (24px base = thickness 2)
  const strokeWidth = (thickness * size) / 24
  
  // Determine strokeDasharray based on style
  let strokeDasharray: string | undefined = undefined
  let strokeLinecap: 'round' | 'butt' | 'square' | undefined = undefined
  if (style === 'dashed') {
    strokeDasharray = '4 2' // Short dashes with small gaps
  } else if (style === 'dotted') {
    strokeDasharray = `0 ${thickness * 2}` // Dots with spacing - gap is 2x thickness to ensure visible space
    strokeLinecap = 'round'
  } else if (style === 'long-dash') {
    strokeDasharray = '8 3' // Longer dashes with smaller gaps
  }
  
  // Detect dark mode for stroke color
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

  // Set stroke color based on theme
  const strokeColor = isDarkMode ? '#f3f4f6' : '#111827' // gray-100 in dark mode, gray-900 in light mode
  
  if (type === 'bezier') {
    // Sine wave (bezier)
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <path
          d="M4 12 Q8 6, 12 12 T20 12"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap={strokeLinecap || 'round'}
          fill="none"
        />
      </svg>
    )
  } else if (type === 'smoothstep') {
    // Three segments (horizontal, vertical, horizontal) with two smooth rounded corners - two equal-length horizontal segments, centered
    // Both corners are more rounded for better visibility at small sizes
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <path
          d="M4 16 L10 16 Q12 16, 12 13 Q12 10, 12 7 Q12 4, 12 4 Q12 4, 12 4 Q13 4, 13 4 Q14 4, 14 4 L20 4"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap={strokeLinecap || 'round'}
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    )
  } else if (type === 'step') {
    // Stepped line with sharp corners - two equal-length horizontal segments, centered
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <path
          d="M4 16 L12 16 L12 4 L20 4"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap={strokeLinecap || 'round'}
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    )
  } else {
    // Straight line
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <path
          d="M4 12 L20 12"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap={strokeLinecap || 'round'}
        />
      </svg>
    )
  }
}

interface EdgeToolbarProps {
  /** Edge midpoint position in screen coordinates */
  midpoint: { x: number; y: number }
  /** Whether the toolbar should be visible */
  visible: boolean
  /** Relationship data */
  relationship: {
    id: string
    metadata?: Record<string, unknown>
  }
  /** Callback when edit button is clicked */
  onEdit?: () => void
}

export function EdgeToolbar({
  midpoint,
  visible,
  relationship,
  onEdit,
}: EdgeToolbarProps) {
      const { hasWriteAccess } = useMapPermissions()
      const { updateRelationship, deleteRelationship } = useRelationshipActions()
      const { reverseRelationship } = useCanvasMutations()
      const setRelationshipEditorOpen = useUIStore((state) => state.setRelationshipEditorOpen)
      const setSelectedRelationshipId = useUIStore((state) => state.setSelectedRelationshipId)
      const recordDeletion = useUndoStore((state) => state.recordDeletion)
      const relationships = useRelationships()
      
      // Get full relationship data from the relationships array
      const fullRelationship = relationships.find((r) => r.id === relationship.id)

  // Get current style values - initialize from relationship metadata if available
  const relationshipMetadata = relationship?.metadata || {}
  const initialColor = (relationshipMetadata.edgeColor as string) || '#6366f1'
  const initialStyle = (relationshipMetadata.edgeStyle as 'solid' | 'dashed' | 'dotted' | 'long-dash') || 'solid'
  const initialType = (relationshipMetadata.edgeType as 'bezier' | 'smoothstep' | 'step' | 'straight') || 'bezier'
  const initialThickness = (relationshipMetadata.edgeThickness as number) || 2
  
  const [edgeColor, setEdgeColor] = useState<string>(initialColor)
  const [edgeStyle, setEdgeStyle] = useState<'solid' | 'dashed' | 'dotted' | 'long-dash'>(initialStyle)
  const [edgeType, setEdgeType] = useState<'bezier' | 'smoothstep' | 'step' | 'straight'>(initialType)
  const [edgeThickness, setEdgeThickness] = useState<number>(initialThickness)

  // Update local state when relationship changes
  useEffect(() => {
    if (relationship) {
      const metadata = relationship.metadata || {}
      const color = (metadata.edgeColor as string) || '#6366f1'
      const style = (metadata.edgeStyle as 'solid' | 'dashed' | 'dotted' | 'long-dash') || 'solid'
      const type = (metadata.edgeType as 'bezier' | 'smoothstep' | 'step' | 'straight') || 'bezier'
      const thickness = (metadata.edgeThickness as number) || 2
      setEdgeColor(color)
      setEdgeStyle(style)
      setEdgeType(type)
      setEdgeThickness(thickness)
    }
  }, [relationship])

  const handleDismiss = () => {
    setSelectedRelationshipId(null)
  }

  const handleRelationshipStyleUpdate = async (updates: {
    edgeColor?: string
    edgeStyle?: 'solid' | 'dashed' | 'dotted' | 'long-dash'
    edgeType?: 'bezier' | 'smoothstep' | 'step' | 'straight'
    edgeThickness?: number
  }) => {
    if (!relationship || !hasWriteAccess) return

    const currentMetadata = relationship.metadata || {}
    const newMetadata = {
      ...currentMetadata,
      ...updates,
    }

    try {
      await updateRelationship(relationship.id, { metadata: newMetadata })
    } catch (error) {
      console.error('Failed to update relationship style:', error)
    }
  }

  const handleEditClick = () => {
    // If custom onEdit handler is provided, use it (assumes it handles editor state)
    // Otherwise, use default behavior: select relationship and open editor
    if (onEdit) {
      onEdit()
    } else {
      // Default behavior: ensure the relationship is selected and open the editor
      if (relationship.id) {
        setSelectedRelationshipId(relationship.id)
        setRelationshipEditorOpen(true)
      }
    }
  }

  const handleReverseClick = async () => {
    if (!fullRelationship || !hasWriteAccess) return
    
    try {
      await reverseRelationship(relationship.id, {
        fromConceptId: fullRelationship.fromConceptId,
        toConceptId: fullRelationship.toConceptId,
        primaryLabel: fullRelationship.primaryLabel,
        reverseLabel: fullRelationship.reverseLabel,
      })
    } catch (error) {
      console.error('Failed to reverse relationship:', error)
      alert('Failed to reverse relationship. Please try again.')
    }
  }

  const handleDeleteClick = async () => {
    if (!relationship || !hasWriteAccess) return
    if (!confirm(`Are you sure you want to delete this relationship?`)) return
    try {
      recordDeletion('relationship', relationship.id)
      await deleteRelationship(relationship.id)
      setSelectedRelationshipId(null)
    } catch (error) {
      console.error('Failed to delete relationship:', error)
    }
  }

  // Ensure values are always valid
  const safeEdgeStyle: 'solid' | 'dashed' | 'dotted' | 'long-dash' = 
    typeof edgeStyle === 'string' && (edgeStyle === 'solid' || edgeStyle === 'dashed' || edgeStyle === 'dotted' || edgeStyle === 'long-dash') 
      ? edgeStyle 
      : 'solid'
  const safeEdgeType: 'bezier' | 'smoothstep' | 'step' | 'straight' = 
    typeof edgeType === 'string' && (edgeType === 'bezier' || edgeType === 'smoothstep' || edgeType === 'step' || edgeType === 'straight')
      ? edgeType 
      : 'bezier'
  const safeEdgeColor = typeof edgeColor === 'string' && edgeColor ? edgeColor : '#6366f1'
  const safeEdgeThickness = typeof edgeThickness === 'number' && edgeThickness >= 1 && edgeThickness <= 8 
    ? edgeThickness 
    : 2

  if (!visible || !relationship) {
    return null
  }

  return (
    <FloatingToolbar
      visible={visible}
      midpoint={midpoint}
      onDismiss={handleDismiss}
    >
      <EdgeColorPickerIcon
        value={safeEdgeColor}
        onChange={(color) => {
          setEdgeColor(color)
          handleRelationshipStyleUpdate({ edgeColor: color })
        }}
        disabled={!hasWriteAccess}
      />
      <LineSettingsDropdown
        style={safeEdgeStyle}
        type={safeEdgeType}
        thickness={safeEdgeThickness}
        onStyleChange={(style) => {
          setEdgeStyle(style)
          handleRelationshipStyleUpdate({ edgeStyle: style })
        }}
        onTypeChange={(type) => {
          setEdgeType(type)
          handleRelationshipStyleUpdate({ edgeType: type })
        }}
        onThicknessChange={(thickness) => {
          setEdgeThickness(thickness)
          handleRelationshipStyleUpdate({ edgeThickness: thickness })
        }}
        disabled={!hasWriteAccess}
      />
      <IconButton
        onClick={handleReverseClick}
        disabled={!hasWriteAccess || !fullRelationship}
        className="h-8 w-8 p-0 [&_svg]:size-auto!"
        title="Reverse Direction"
      >
        <ArrowLeftRight className="h-5 w-5" strokeWidth={1.5} />
      </IconButton>
      <IconButton
        onClick={handleEditClick}
        disabled={!hasWriteAccess}
        className="h-8 w-8 p-0 [&_svg]:size-auto!"
        title="Edit"
      >
        <Pencil className="h-5 w-5" strokeWidth={1.5} />
      </IconButton>
      <IconButton
        onClick={handleDeleteClick}
        disabled={!hasWriteAccess}
        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 [&_svg]:size-auto!"
        title="Delete"
      >
        <Trash2 className="h-5 w-5" strokeWidth={1.5} />
      </IconButton>
    </FloatingToolbar>
  )
}
