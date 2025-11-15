/**
 * Undo store for managing deletion history and mutation tracking.
 * Uses Zustand for shared state management across components.
 */

import { create } from 'zustand'
import type {
  CreateConceptData,
  UpdateConceptData,
} from '@/hooks/useConceptActions'
import type {
  CreateRelationshipData,
  UpdateRelationshipData,
} from '@/hooks/useRelationshipActions'
import type {
  CreateCommentData,
  UpdateCommentData,
} from '@/hooks/useCommentActions'

/**
 * Mutation command type.
 * Represents a single mutation operation that can be executed and undone.
 */
export type MutationType =
  | 'createConcept'
  | 'updateConcept'
  | 'deleteConcept'
  | 'createRelationship'
  | 'updateRelationship'
  | 'reverseRelationship'
  | 'deleteRelationship'
  | 'createComment'
  | 'updateComment'
  | 'deleteComment'
  | 'linkCommentToConcept'
  | 'unlinkCommentFromConcept'
  | 'updateMap'

/**
 * Base mutation command interface.
 */
export interface MutationCommand {
  /** Type of mutation */
  type: MutationType
  /** Unique command ID */
  id: string
  /** Timestamp when mutation was executed */
  timestamp: number
  /** Operation ID to group related mutations */
  operationId: string
}

/**
 * Concept mutation commands.
 */
export interface CreateConceptCommand extends MutationCommand {
  type: 'createConcept'
  data: CreateConceptData
  conceptId: string
}

export interface UpdateConceptCommand extends MutationCommand {
  type: 'updateConcept'
  conceptId: string
  updates: UpdateConceptData
  previousState?: {
    label?: string
    position?: { x: number; y: number }
    notes?: string
    metadata?: Record<string, unknown>
    showNotesAndMetadata?: boolean
    userPlaced?: boolean
  }
}

export interface DeleteConceptCommand extends MutationCommand {
  type: 'deleteConcept'
  conceptId: string
}

/**
 * Relationship mutation commands.
 */
export interface CreateRelationshipCommand extends MutationCommand {
  type: 'createRelationship'
  data: CreateRelationshipData
  relationshipId: string
}

export interface UpdateRelationshipCommand extends MutationCommand {
  type: 'updateRelationship'
  relationshipId: string
  updates: UpdateRelationshipData
  previousState?: {
    primaryLabel?: string
    reverseLabel?: string
    notes?: string
    metadata?: Record<string, unknown>
  }
}

export interface ReverseRelationshipCommand extends MutationCommand {
  type: 'reverseRelationship'
  relationshipId: string
  previousState: {
    fromConceptId: string
    toConceptId: string
    primaryLabel: string
    reverseLabel: string
  }
}

export interface DeleteRelationshipCommand extends MutationCommand {
  type: 'deleteRelationship'
  relationshipId: string
}

/**
 * Comment mutation commands.
 */
export interface CreateCommentCommand extends MutationCommand {
  type: 'createComment'
  data: CreateCommentData
  commentId: string
}

export interface UpdateCommentCommand extends MutationCommand {
  type: 'updateComment'
  commentId: string
  updates: UpdateCommentData
  previousState?: {
    text?: string
    position?: { x: number; y: number }
    userPlaced?: boolean
  }
}

export interface DeleteCommentCommand extends MutationCommand {
  type: 'deleteComment'
  commentId: string
}

export interface LinkCommentToConceptCommand extends MutationCommand {
  type: 'linkCommentToConcept'
  commentId: string
  conceptId: string
}

export interface UnlinkCommentFromConceptCommand extends MutationCommand {
  type: 'unlinkCommentFromConcept'
  commentId: string
  conceptId: string
}

/**
 * Map mutation commands.
 */
export interface UpdateMapCommand extends MutationCommand {
  type: 'updateMap'
  mapId: string
  updates: { name?: string; layoutAlgorithm?: string }
  previousState?: {
    name?: string
    layoutAlgorithm?: string
  }
}

/**
 * Union type of all mutation commands.
 */
export type MutationCommandUnion =
  | CreateConceptCommand
  | UpdateConceptCommand
  | DeleteConceptCommand
  | CreateRelationshipCommand
  | UpdateRelationshipCommand
  | ReverseRelationshipCommand
  | DeleteRelationshipCommand
  | CreateCommentCommand
  | UpdateCommentCommand
  | DeleteCommentCommand
  | LinkCommentToConceptCommand
  | UnlinkCommentFromConceptCommand
  | UpdateMapCommand

/**
 * Represents a deletion entry in the undo history.
 */
export interface DeletionEntry {
  /** Type of item deleted */
  type: 'concept' | 'relationship' | 'comment'
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
 * Maximum number of mutation commands to keep in history.
 */
const MAX_MUTATION_HISTORY_SIZE = 100

/**
 * Time window in milliseconds to group deletions into the same operation.
 * Deletions within this window are considered part of the same operation.
 */
const OPERATION_TIME_WINDOW_MS = 1000 // 1 second

/**
 * Generate a unique command ID.
 * Uses a consistent format: cmd_timestamp_random
 * 
 * @returns A unique command ID string
 */
export function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique operation ID.
 * Uses a consistent format: op_timestamp_random
 * 
 * @returns A unique operation ID string
 */
export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * State interface for undo history.
 */
export interface UndoState {
  /** Deletion history array (for backward compatibility) */
  deletionHistory: DeletionEntry[]
  /** Mutation command history (all mutations) */
  mutationHistory: MutationCommandUnion[]
  /** Redo stack (operations that were undone) */
  redoStack: MutationCommandUnion[]
  /** Current operation ID for grouping deletions */
  currentOperationId: string | null
  /** Timestamp when current operation started */
  currentOperationStartTime: number | null
  /** Record a deletion (for backward compatibility) */
  recordDeletion: (type: 'concept' | 'relationship' | 'comment', id: string) => void
  /** Record a mutation command */
  recordMutation: (command: MutationCommandUnion) => void
  /** Start a new deletion operation */
  startOperation: () => void
  /** End the current deletion operation */
  endOperation: () => void
  /** Get the deletion history */
  getHistory: () => DeletionEntry[]
  /** Get all deletions in the most recent operation */
  getMostRecentOperation: () => DeletionEntry[]
  /** Get all mutations in the most recent operation */
  getMostRecentMutationOperation: () => MutationCommandUnion[]
  /** Clear the deletion history */
  clearHistory: () => void
  /** Clear the mutation history */
  clearMutationHistory: () => void
  /** Remove deletions from the most recent operation */
  removeMostRecentOperation: () => void
  /** Remove mutations from the most recent operation */
  removeMostRecentMutationOperation: () => void
  /** Push operation to redo stack */
  pushToRedoStack: (operation: MutationCommandUnion[]) => void
  /** Get most recent operation from redo stack */
  getMostRecentRedoOperation: () => MutationCommandUnion[]
  /** Remove most recent operation from redo stack */
  removeMostRecentRedoOperation: () => void
  /** Clear redo stack */
  clearRedoStack: () => void
  /** Check if redo is available */
  canRedo: () => boolean
  /** Check if undo is available */
  canUndo: () => boolean
}

/**
 * Zustand store for undo history management.
 * Provides shared state for deletion history across all components.
 */
export const useUndoStore = create<UndoState>((set, get) => ({
  deletionHistory: [],
  mutationHistory: [],
  redoStack: [],
  currentOperationId: null,
  currentOperationStartTime: null,
  
  startOperation: () => {
    const operationId = generateOperationId()
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
        operationId = generateOperationId()
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
        operationId = generateOperationId()
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
  
  recordMutation: (command) => {
    set((state) => {
      // Clear redo stack when new mutations are recorded (standard undo/redo behavior)
      const newHistory = [command, ...state.mutationHistory]
      
      // Trim history if it exceeds max size
      if (newHistory.length > MAX_MUTATION_HISTORY_SIZE) {
        return { 
          mutationHistory: newHistory.slice(0, MAX_MUTATION_HISTORY_SIZE),
          redoStack: [] // Clear redo stack on new mutation
        }
      }
      
      return { 
        mutationHistory: newHistory,
        redoStack: [] // Clear redo stack on new mutation
      }
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
  
  getMostRecentMutationOperation: () => {
    const history = get().mutationHistory
    if (history.length === 0) {
      return []
    }
    
    // Get the operation ID of the most recent mutation
    const mostRecentOperationId = history[0].operationId
    
    // Return all mutations with the same operation ID
    return history.filter((command) => command.operationId === mostRecentOperationId)
  },
  
  clearHistory: () => {
    set({ deletionHistory: [] })
  },
  
  clearMutationHistory: () => {
    set({ mutationHistory: [] })
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
  
  removeMostRecentMutationOperation: () => {
    set((state) => {
      if (state.mutationHistory.length === 0) {
        return state
      }
      
      // Get the operation ID of the most recent mutation
      const mostRecentOperationId = state.mutationHistory[0].operationId
      
      // Remove all mutations with the same operation ID
      const remainingHistory = state.mutationHistory.filter(
        (command) => command.operationId !== mostRecentOperationId
      )
      
      return { mutationHistory: remainingHistory }
    })
  },
  
  pushToRedoStack: (operation) => {
    set((state) => {
      // Add operation to redo stack (newest first, same as mutation history)
      const newRedoStack = [...operation, ...state.redoStack]
      
      // Trim redo stack if it exceeds max size
      if (newRedoStack.length > MAX_MUTATION_HISTORY_SIZE) {
        return { redoStack: newRedoStack.slice(0, MAX_MUTATION_HISTORY_SIZE) }
      }
      
      return { redoStack: newRedoStack }
    })
  },
  
  getMostRecentRedoOperation: () => {
    const redoStack = get().redoStack
    if (redoStack.length === 0) {
      return []
    }
    
    // Get the operation ID of the most recent redo operation
    const mostRecentOperationId = redoStack[0].operationId
    
    // Return all commands with the same operation ID
    return redoStack.filter((command) => command.operationId === mostRecentOperationId)
  },
  
  removeMostRecentRedoOperation: () => {
    set((state) => {
      if (state.redoStack.length === 0) {
        return state
      }
      
      // Get the operation ID of the most recent redo operation
      const mostRecentOperationId = state.redoStack[0].operationId
      
      // Remove all commands with the same operation ID
      const remainingRedoStack = state.redoStack.filter(
        (command) => command.operationId !== mostRecentOperationId
      )
      
      return { redoStack: remainingRedoStack }
    })
  },
  
  clearRedoStack: () => {
    set({ redoStack: [] })
  },
  
  canRedo: () => {
    return get().redoStack.length > 0
  },
  
  canUndo: () => {
    return get().mutationHistory.length > 0
  },
}))

