/**
 * Undo store for managing deletion history.
 * Uses Zustand for shared state management across components.
 */

import { create } from 'zustand'

/**
 * Represents a deletion entry in the undo history.
 */
export interface DeletionEntry {
  /** Type of item deleted */
  type: 'concept' | 'relationship'
  /** ID of the deleted item */
  id: string
  /** Timestamp when deleted */
  deletedAt: number
  /** Operation ID to group related deletions */
  operationId: string
}

/**
 * Maximum number of deletion entries to keep in history.
 */
const MAX_HISTORY_SIZE = 50

/**
 * Time window in milliseconds to group deletions into the same operation.
 * Deletions within this window are considered part of the same operation.
 */
const OPERATION_TIME_WINDOW_MS = 1000 // 1 second

/**
 * State interface for undo history.
 */
interface UndoState {
  /** Deletion history array */
  deletionHistory: DeletionEntry[]
  /** Current operation ID for grouping deletions */
  currentOperationId: string | null
  /** Timestamp when current operation started */
  currentOperationStartTime: number | null
  /** Record a deletion */
  recordDeletion: (type: 'concept' | 'relationship', id: string) => void
  /** Start a new deletion operation */
  startOperation: () => void
  /** End the current deletion operation */
  endOperation: () => void
  /** Get the deletion history */
  getHistory: () => DeletionEntry[]
  /** Get all deletions in the most recent operation */
  getMostRecentOperation: () => DeletionEntry[]
  /** Clear the deletion history */
  clearHistory: () => void
  /** Remove deletions from the most recent operation */
  removeMostRecentOperation: () => void
}

/**
 * Zustand store for undo history management.
 * Provides shared state for deletion history across all components.
 */
export const useUndoStore = create<UndoState>((set, get) => ({
  deletionHistory: [],
  currentOperationId: null,
  currentOperationStartTime: null,
  
  startOperation: () => {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    set({
      currentOperationId: operationId,
      currentOperationStartTime: Date.now(),
    })
  },
  
  endOperation: () => {
    set({
      currentOperationId: null,
      currentOperationStartTime: null,
    })
  },
  
  recordDeletion: (type, id) => {
    const state = get()
    const now = Date.now()
    
    // Determine operation ID
    let operationId: string
    if (state.currentOperationId && state.currentOperationStartTime) {
      // Check if we're still within the operation time window
      const timeSinceStart = now - state.currentOperationStartTime
      if (timeSinceStart < OPERATION_TIME_WINDOW_MS) {
        operationId = state.currentOperationId
      } else {
        // Time window expired, start new operation
        operationId = `op_${now}_${Math.random().toString(36).substr(2, 9)}`
        set({
          currentOperationId: operationId,
          currentOperationStartTime: now,
        })
      }
    } else {
      // No current operation, check if most recent deletion is within time window
      const mostRecent = state.deletionHistory[0]
      if (mostRecent && (now - mostRecent.deletedAt) < OPERATION_TIME_WINDOW_MS) {
        operationId = mostRecent.operationId
      } else {
        // Start new operation
        operationId = `op_${now}_${Math.random().toString(36).substr(2, 9)}`
        set({
          currentOperationId: operationId,
          currentOperationStartTime: now,
        })
      }
    }
    
    const entry: DeletionEntry = {
      type,
      id,
      deletedAt: now,
      operationId,
    }
    
    set((state) => {
      const newHistory = [entry, ...state.deletionHistory]
      
      // Trim history if it exceeds max size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return { deletionHistory: newHistory.slice(0, MAX_HISTORY_SIZE) }
      }
      
      return { deletionHistory: newHistory }
    })
  },
  
  getHistory: () => {
    return [...get().deletionHistory]
  },
  
  getMostRecentOperation: () => {
    const history = get().deletionHistory
    if (history.length === 0) {
      return []
    }
    
    // Get the operation ID of the most recent deletion
    const mostRecentOperationId = history[0].operationId
    
    // Return all deletions with the same operation ID
    return history.filter((entry) => entry.operationId === mostRecentOperationId)
  },
  
  clearHistory: () => {
    set({ deletionHistory: [] })
  },
  
  removeMostRecentOperation: () => {
    set((state) => {
      if (state.deletionHistory.length === 0) {
        return state
      }
      
      // Get the operation ID of the most recent deletion
      const mostRecentOperationId = state.deletionHistory[0].operationId
      
      // Remove all deletions with the same operation ID
      const remainingHistory = state.deletionHistory.filter(
        (entry) => entry.operationId !== mostRecentOperationId
      )
      
      return { deletionHistory: remainingHistory }
    })
  },
}))

