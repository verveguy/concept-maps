import * as React from "react"
import { Button, type ButtonProps } from "./button"
import { cn } from "@/lib/utils"

/**
 * IconButton component - a borderless, shadowless button for icon-only actions.
 * Provides consistent styling for icon buttons throughout the application.
 * 
 * @example
 * ```tsx
 * <IconButton onClick={handleClick} title="Share map">
 *   <Share2 className="h-4 w-4" />
 * </IconButton>
 * ```
 */
export interface IconButtonProps extends Omit<ButtonProps, "variant" | "size"> {
  /** Optional size override - defaults to icon size */
  size?: ButtonProps["size"]
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "icon", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size={size}
        className={cn("border-0 shadow-none", className)}
        {...props}
      />
    )
  }
)
IconButton.displayName = "IconButton"

export { IconButton }

