/**
 * Utility functions for common operations.
 * Includes class name merging utilities for Tailwind CSS.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names using clsx and tailwind-merge.
 * Combines conditional classes and resolves Tailwind CSS conflicts.
 * 
 * @param inputs - Class values to merge (strings, objects, arrays, etc.)
 * @returns Merged class name string
 * 
 * @example
 * ```ts
 * cn('foo', 'bar') // 'foo bar'
 * cn('px-2', 'px-4') // 'px-4' (conflict resolved)
 * cn('foo', { bar: true }) // 'foo bar'
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
