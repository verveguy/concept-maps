/**
 * Utility functions for common operations.
 * Includes class name merging utilities for Tailwind CSS.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge and resolve Tailwind CSS class names.
 * 
 * Combines `clsx` for conditional class merging with `tailwind-merge` for
 * intelligent Tailwind CSS conflict resolution. When conflicting Tailwind
 * classes are provided (e.g., `px-2` and `px-4`), the function automatically
 * resolves the conflict by keeping the last occurrence.
 * 
 * **Features:**
 * - Conditional class application (objects, arrays)
 * - Tailwind CSS conflict resolution
 * - Null/undefined filtering
 * - Type-safe class name handling
 * 
 * @param inputs - Class values to merge. Can be strings, objects with boolean values, arrays, or any combination
 * @returns Merged and resolved class name string
 * 
 * @example
 * ```tsx
 * import { cn } from '@/lib/utils'
 * 
 * // Basic usage
 * cn('foo', 'bar') // 'foo bar'
 * 
 * // Tailwind conflict resolution
 * cn('px-2', 'px-4') // 'px-4' (px-2 is removed)
 * cn('bg-red-500', 'bg-blue-500') // 'bg-blue-500'
 * 
 * // Conditional classes
 * cn('base-class', { 'active': isActive, 'disabled': isDisabled })
 * 
 * // Combining all features
 * cn(
 *   'flex items-center',
 *   isPrimary && 'bg-primary',
 *   size === 'large' ? 'px-6 py-3' : 'px-4 py-2',
 *   className // from props
 * )
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
