/**
 * Popover UI component.
 * A wrapper around Radix UI Popover primitive with custom styling.
 * Provides a floating content panel that appears relative to a trigger element.
 */

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

/**
 * Popover root component.
 * Manages the popover state and behavior.
 */
const Popover = PopoverPrimitive.Root

/**
 * Popover trigger component.
 * Element that toggles the popover when clicked.
 */
const PopoverTrigger = PopoverPrimitive.Trigger

/**
 * Popover content component.
 * The floating panel that displays popover content.
 * 
 * @param className - Additional CSS classes
 * @param align - Alignment relative to trigger ('center' | 'start' | 'end')
 * @param sideOffset - Offset distance from trigger in pixels
 */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
