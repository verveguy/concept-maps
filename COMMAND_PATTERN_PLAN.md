# Command Pattern Implementation Plan for Multiplayer Mutation Handling

## Executive Summary

This document outlines a comprehensive plan to implement a command pattern for mutation handling in the concept mapping application. The system must handle the multiplayer nature of InstantDB, where concurrent modifications require intelligent conflict resolution and partial reversals rather than simple state reverts.

## Current State Analysis

### Existing Undo System
- **Scope**: Currently handles only deletions (soft deletes via `deletedAt` timestamp)
- **Architecture**: 
  - Zustand store (`undoStore.ts`) tracks deletion history
  - Operation grouping via time windows (1 second) or explicit `startOperation()/endOperation()`
  - Maximum history size: 50 entries
- **Limitations**:
  - Only supports deletions, not updates or creates
  - No conflict detection for multiplayer scenarios
  - Simple reversal mechanism (clears `deletedAt` via `merge({ deletedAt: null })`)
  - No operation metadata tracking beyond timestamps

### Mutation Patterns in Codebase
1. **Concept Operations**:
   - Create: `createConcept()` - creates with links to map
   - Update: `updateConcept()` - updates label, position, notes, metadata
   - Delete: `deleteConcept()` - soft delete via `deletedAt`
   - Undelete: `undeleteConcept()` - removes `deletedAt`

2. **Relationship Operations**:
   - Create: `createRelationship()` - creates with links to map and concepts
   - Update: `updateRelationship()` - updates labels, notes, metadata
   - Delete: `deleteRelationship()` - soft delete via `deletedAt`
   - Undelete: `undeleteRelationship()` - removes `deletedAt`

3. **Map Operations**:
   - Create: `createMap()` - creates with creator link
   - Update: `updateMap()` - updates name
   - Delete: `deleteMap()` - hard delete (permanent)

4. **Perspective Operations**:
   - Create: `createPerspective()` - creates with concept/relationship IDs
   - Update: `updatePerspective()` - updates name, concept/relationship lists
   - Delete: `deletePerspective()` - hard delete (permanent)
   - Toggle: `toggleConceptInPerspective()` - modifies arrays

5. **Sharing Operations**:
   - Create invitations, accept invitations, revoke shares
   - Link/unlink permission relationships
   - Complex multi-step transactions

### InstantDB Characteristics
- **Atomic Transactions**: `db.transact([...])` ensures all operations succeed or fail together
- **Real-time Sync**: Changes propagate immediately to all connected clients
- **Link-based Relationships**: Uses `.link()` and `.unlink()` instead of foreign keys
- **Soft Deletes**: Supported via optional `deletedAt` fields
- **No Built-in Versioning**: No native support for undo/redo or operation history

## Design Goals

1. **Comprehensive Coverage**: Support all mutation types (create, update, delete, link/unlink)
2. **Multiplayer Awareness**: Handle concurrent modifications gracefully
3. **Conflict Resolution**: Merge changes intelligently rather than overwrite
4. **Partial Reversals**: Support operations that can't be fully reversed
5. **Operation Grouping**: Group related mutations into logical operations
6. **Metadata Tracking**: Track operation context (user, timestamp, operation ID)
7. **Performance**: Efficient storage and retrieval of command history
8. **Type Safety**: Full TypeScript support for command types

## Architecture Overview

### Core Components

1. **Command Interface**: Base interface for all commands
2. **Command Store**: Enhanced Zustand store for command history
3. **Command Executor**: Executes commands and tracks reversals
4. **Conflict Resolver**: Handles concurrent modifications
5. **Operation Builder**: Groups related commands into operations
6. **Command Registry**: Type-safe command factory

### Command Lifecycle

```
User Action → Command Creation → Execute → Store History
                                         ↓
                                    Multiplayer Sync
                                         ↓
                              Conflict Detection → Resolution
                                         ↓
                                    Undo/Redo Support
```

## Detailed Design

### 1. Command Interface

```typescript
/**
 * Base interface for all commands.
 * Commands encapsulate mutations with their reverse operations.
 */
interface Command {
  /** Unique command ID */
  id: string
  /** Type of command (for type narrowing) */
  type: CommandType
  /** Entity type being modified */
  entityType: EntityType
  /** Entity ID being modified */
  entityId: string
  /** Timestamp when command was executed */
  executedAt: number
  /** User ID who executed the command */
  userId: string
  /** Operation ID grouping related commands */
  operationId: string
  /** Whether command can be reversed */
  reversible: boolean
  /** Execute the command */
  execute(): Promise<void>
  /** Reverse the command (if reversible) */
  reverse(): Promise<CommandResult>
  /** Get human-readable description */
  getDescription(): string
}

/**
 * Types of commands supported
 */
type CommandType = 
  | 'create'
  | 'update'
  | 'delete'
  | 'link'
  | 'unlink'
  | 'batch' // Composite command

/**
 * Entity types in the system
 */
type EntityType = 
  | 'concept'
  | 'relationship'
  | 'map'
  | 'perspective'
  | 'share'
  | 'shareInvitation'

/**
 * Result of command execution or reversal
 */
interface CommandResult {
  success: boolean
  conflict?: ConflictInfo
  error?: Error
  partialReversal?: PartialReversalInfo
}

/**
 * Information about conflicts detected during reversal
 */
interface ConflictInfo {
  type: 'concurrent_modification' | 'entity_deleted' | 'permission_denied'
  description: string
  affectedFields?: string[]
  currentState?: Record<string, unknown>
  attemptedState?: Record<string, unknown>
}

/**
 * Information about partial reversals
 */
interface PartialReversalInfo {
  reason: string
  mergedFields: Record<string, unknown>
  preservedFields: Record<string, unknown>
}
```

### 2. Concrete Command Implementations

#### 2.1 Create Commands

```typescript
/**
 * Command for creating a new entity.
 * Reversal: Soft delete (if supported) or hard delete.
 */
class CreateCommand implements Command {
  type = 'create' as const
  reversible = true
  
  constructor(
    public entityType: EntityType,
    public entityId: string,
    public userId: string,
    public operationId: string,
    public data: Record<string, unknown>,
    public links: Record<string, string> = {},
    private executeFn: () => Promise<void>
  ) {
    this.id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.executedAt = Date.now()
  }
  
  async execute(): Promise<void> {
    await this.executeFn()
  }
  
  async reverse(): Promise<CommandResult> {
    // For concepts/relationships: soft delete
    // For maps/perspectives: hard delete (may fail if linked)
    // Need to check current state first
    const currentState = await this.getCurrentState()
    
    if (!currentState) {
      return {
        success: false,
        conflict: {
          type: 'entity_deleted',
          description: 'Entity was already deleted by another user',
        },
      }
    }
    
    // Attempt reversal based on entity type
    if (this.entityType === 'concept' || this.entityType === 'relationship') {
      // Soft delete via deletedAt
      await db.transact([
        tx[this.entityType + 's'][this.entityId].merge({
          deletedAt: Date.now(),
          updatedAt: Date.now(),
        }),
      ])
      return { success: true }
    } else {
      // Hard delete (may fail if has dependencies)
      try {
        await db.transact([
          tx[this.entityType + 's'][this.entityId].delete(),
        ])
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error as Error,
          conflict: {
            type: 'permission_denied',
            description: 'Cannot delete entity with dependencies',
          },
        }
      }
    }
  }
  
  private async getCurrentState(): Promise<unknown | null> {
    // Query current state from InstantDB
    // Implementation depends on entity type
  }
  
  getDescription(): string {
    return `Create ${this.entityType} "${this.entityId}"`
  }
}
```

#### 2.2 Update Commands

```typescript
/**
 * Command for updating an existing entity.
 * Stores both old and new state for reversal.
 */
class UpdateCommand implements Command {
  type = 'update' as const
  reversible = true
  
  constructor(
    public entityType: EntityType,
    public entityId: string,
    public userId: string,
    public operationId: string,
    public oldState: Record<string, unknown>,
    public newState: Record<string, unknown>,
    private executeFn: () => Promise<void>
  ) {
    this.id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.executedAt = Date.now()
  }
  
  async execute(): Promise<void> {
    await this.executeFn()
  }
  
  async reverse(): Promise<CommandResult> {
    // Check current state to detect conflicts
    const currentState = await this.getCurrentState()
    
    if (!currentState) {
      return {
        success: false,
        conflict: {
          type: 'entity_deleted',
          description: 'Entity was deleted by another user',
        },
      }
    }
    
    // Compare current state with expected state (what we changed it to)
    const conflicts = this.detectConflicts(currentState, this.newState)
    
    if (conflicts.length > 0) {
      // Partial reversal: merge old values with current state
      const mergedState = this.mergeStates(this.oldState, currentState)
      
      await db.transact([
        tx[this.entityType + 's'][this.entityId].merge({
          ...mergedState,
          updatedAt: Date.now(),
        }),
      ])
      
      return {
        success: true,
        partialReversal: {
          reason: 'Concurrent modifications detected',
          mergedFields: mergedState,
          preservedFields: this.getPreservedFields(currentState, this.newState),
        },
      }
    }
    
    // No conflicts: full reversal
    await db.transact([
      tx[this.entityType + 's'][this.entityId].merge({
        ...this.oldState,
        updatedAt: Date.now(),
      }),
    ])
    
    return { success: true }
  }
  
  private detectConflicts(
    current: Record<string, unknown>,
    expected: Record<string, unknown>
  ): string[] {
    const conflicts: string[] = []
    for (const [key, value] of Object.entries(expected)) {
      if (current[key] !== value && key !== 'updatedAt') {
        conflicts.push(key)
      }
    }
    return conflicts
  }
  
  private mergeStates(
    oldState: Record<string, unknown>,
    currentState: Record<string, unknown>
  ): Record<string, unknown> {
    // Merge strategy: prefer old values for fields we changed,
    // keep current values for fields others changed
    const merged: Record<string, unknown> = { ...currentState }
    
    // Restore fields we changed that weren't modified by others
    for (const [key, oldValue] of Object.entries(oldState)) {
      if (key in this.newState && currentState[key] === this.newState[key]) {
        // Field matches what we set, safe to restore old value
        merged[key] = oldValue
      }
    }
    
    return merged
  }
  
  private getPreservedFields(
    current: Record<string, unknown>,
    expected: Record<string, unknown>
  ): Record<string, unknown> {
    const preserved: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(current)) {
      if (key in expected && value !== expected[key]) {
        preserved[key] = value
      }
    }
    return preserved
  }
  
  private async getCurrentState(): Promise<Record<string, unknown> | null> {
    // Query current state - implementation depends on entity type
  }
  
  getDescription(): string {
    const changedFields = Object.keys(this.newState).filter(
      (k) => k !== 'updatedAt' && this.oldState[k] !== this.newState[k]
    )
    return `Update ${this.entityType} "${this.entityId}": ${changedFields.join(', ')}`
  }
}
```

#### 2.3 Delete Commands

```typescript
/**
 * Command for deleting an entity.
 * Stores entity state for restoration.
 */
class DeleteCommand implements Command {
  type = 'delete' as const
  reversible = true
  
  constructor(
    public entityType: EntityType,
    public entityId: string,
    public userId: string,
    public operationId: string,
    public deletedState: Record<string, unknown>, // State before deletion
    private executeFn: () => Promise<void>
  ) {
    this.id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.executedAt = Date.now()
  }
  
  async execute(): Promise<void> {
    await this.executeFn()
  }
  
  async reverse(): Promise<CommandResult> {
    // Check if entity still exists (shouldn't for soft deletes)
    const currentState = await this.getCurrentState()
    
    if (currentState && !currentState.deletedAt) {
      // Entity was already restored by another user
      return {
        success: false,
        conflict: {
          type: 'concurrent_modification',
          description: 'Entity was already restored by another user',
        },
      }
    }
    
    // Restore entity (clear deletedAt for soft deletes)
    if (this.entityType === 'concept' || this.entityType === 'relationship') {
      await db.transact([
        tx[this.entityType + 's'][this.entityId].merge({
          deletedAt: null,
          updatedAt: Date.now(),
        }),
      ])
    } else {
      // Hard delete reversal: recreate entity
      // This is complex and may fail if dependencies changed
      // Would need to recreate with original state and links
      return {
        success: false,
        conflict: {
          type: 'permission_denied',
          description: 'Cannot restore hard-deleted entity',
        },
      }
    }
    
    return { success: true }
  }
  
  private async getCurrentState(): Promise<Record<string, unknown> | null> {
    // Query current state - implementation depends on entity type
  }
  
  getDescription(): string {
    return `Delete ${this.entityType} "${this.entityId}"`
  }
}
```

#### 2.4 Link/Unlink Commands

```typescript
/**
 * Command for linking/unlinking entities.
 * Tracks link relationships for reversal.
 */
class LinkCommand implements Command {
  type = 'link' as const
  reversible = true
  
  constructor(
    public entityType: EntityType,
    public entityId: string,
    public userId: string,
    public operationId: string,
    public linkName: string,
    public targetId: string,
    public isLink: boolean, // true for link, false for unlink
    private executeFn: () => Promise<void>
  ) {
    this.id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.executedAt = Date.now()
  }
  
  async execute(): Promise<void> {
    await this.executeFn()
  }
  
  async reverse(): Promise<CommandResult> {
    // Reverse link operation
    if (this.isLink) {
      // Was a link, now unlink
      await db.transact([
        tx[this.entityType + 's'][this.entityId].unlink({
          [this.linkName]: this.targetId,
        }),
      ])
    } else {
      // Was an unlink, now link
      await db.transact([
        tx[this.entityType + 's'][this.entityId].link({
          [this.linkName]: this.targetId,
        }),
      ])
    }
    
    return { success: true }
  }
  
  getDescription(): string {
    const action = this.isLink ? 'Link' : 'Unlink'
    return `${action} ${this.entityType} "${this.entityId}" to ${this.linkName} "${this.targetId}"`
  }
}
```

#### 2.5 Batch Commands

```typescript
/**
 * Composite command grouping multiple commands.
 * Executes all commands atomically, reverses in reverse order.
 */
class BatchCommand implements Command {
  type = 'batch' as const
  reversible = true
  
  constructor(
    public entityType: EntityType, // Primary entity type
    public entityId: string, // Primary entity ID
    public userId: string,
    public operationId: string,
    public commands: Command[]
  ) {
    this.id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.executedAt = Date.now()
  }
  
  async execute(): Promise<void> {
    // Execute all commands in sequence
    for (const cmd of this.commands) {
      await cmd.execute()
    }
  }
  
  async reverse(): Promise<CommandResult> {
    // Reverse commands in reverse order
    const results: CommandResult[] = []
    let hasPartialReversals = false
    
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const cmd = this.commands[i]
      if (cmd.reversible) {
        const result = await cmd.reverse()
        results.push(result)
        if (result.partialReversal) {
          hasPartialReversals = true
        }
        if (!result.success && !result.partialReversal) {
          // Stop on complete failure
          return {
            success: false,
            conflict: result.conflict,
            error: result.error,
          }
        }
      }
    }
    
    return {
      success: true,
      partialReversal: hasPartialReversals
        ? {
            reason: 'Some commands had partial reversals',
            mergedFields: {},
            preservedFields: {},
          }
        : undefined,
    }
  }
  
  getDescription(): string {
    return `Batch operation: ${this.commands.length} commands`
  }
}
```

### 3. Command Store (Enhanced Zustand Store)

```typescript
interface CommandStoreState {
  /** Command history (newest first) */
  history: Command[]
  /** Maximum history size */
  maxHistorySize: number
  /** Current operation ID */
  currentOperationId: string | null
  /** Operation start time */
  currentOperationStartTime: number | null
  /** Time window for operation grouping (ms) */
  operationTimeWindow: number
  
  /** Record a command */
  recordCommand: (command: Command) => void
  /** Start a new operation */
  startOperation: () => void
  /** End current operation */
  endOperation: () => void
  /** Get command history */
  getHistory: () => Command[]
  /** Get most recent operation */
  getMostRecentOperation: () => Command[]
  /** Clear history */
  clearHistory: () => void
  /** Remove most recent operation */
  removeMostRecentOperation: () => void
  /** Check if undo is available */
  canUndo: () => boolean
  /** Check if redo is available */
  canRedo: () => boolean
  /** Get undo stack (for redo) */
  getUndoStack: () => Command[]
  /** Get redo stack */
  getRedoStack: () => Command[]
}

const useCommandStore = create<CommandStoreState>((set, get) => ({
  history: [],
  undoStack: [],
  redoStack: [],
  maxHistorySize: 100,
  currentOperationId: null,
  currentOperationStartTime: null,
  operationTimeWindow: 1000,
  
  recordCommand: (command) => {
    const state = get()
    const now = Date.now()
    
    // Determine operation ID (same logic as current undoStore)
    let operationId: string
    if (state.currentOperationId && state.currentOperationStartTime) {
      const timeSinceStart = now - state.currentOperationStartTime
      if (timeSinceStart < state.operationTimeWindow) {
        operationId = state.currentOperationId
      } else {
        operationId = `op_${now}_${Math.random().toString(36).substr(2, 9)}`
        set({
          currentOperationId: operationId,
          currentOperationStartTime: now,
        })
      }
    } else {
      const mostRecent = state.history[0]
      if (mostRecent && (now - mostRecent.executedAt) < state.operationTimeWindow) {
        operationId = mostRecent.operationId
      } else {
        operationId = `op_${now}_${Math.random().toString(36).substr(2, 9)}`
        set({
          currentOperationId: operationId,
          currentOperationStartTime: now,
        })
      }
    }
    
    // Update command with operation ID
    command.operationId = operationId
    
    set((state) => {
      const newHistory = [command, ...state.history]
      
      // Trim history if exceeds max size
      if (newHistory.length > state.maxHistorySize) {
        return { history: newHistory.slice(0, state.maxHistorySize) }
      }
      
      return { history: newHistory }
    })
  },
  
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
  
  getHistory: () => [...get().history],
  
  getMostRecentOperation: () => {
    const history = get().history
    if (history.length === 0) return []
    
    const mostRecentOperationId = history[0].operationId
    return history.filter((cmd) => cmd.operationId === mostRecentOperationId)
  },
  
  clearHistory: () => {
    set({ history: [], undoStack: [], redoStack: [] })
  },
  
  removeMostRecentOperation: () => {
    set((state) => {
      if (state.history.length === 0) return state
      
      const mostRecentOperationId = state.history[0].operationId
      const remainingHistory = state.history.filter(
        (cmd) => cmd.operationId !== mostRecentOperationId
      )
      
      return { history: remainingHistory }
    })
  },
  
  canUndo: () => {
    return get().history.length > 0
  },
  
  canRedo: () => {
    return get().redoStack.length > 0
  },
  
  getUndoStack: () => [...get().history],
  
  getRedoStack: () => [...get().redoStack],
}))
```

### 4. Command Executor Hook

```typescript
/**
 * Hook for executing commands with undo/redo support.
 */
export function useCommandExecutor() {
  const commandStore = useCommandStore()
  const auth = db.useAuth()
  const userId = auth.user?.id || 'anonymous'
  
  /**
   * Execute a command and record it in history.
   */
  const execute = useCallback(async (command: Command): Promise<CommandResult> => {
    try {
      // Ensure command has current user ID
      command.userId = userId
      
      // Execute command
      await command.execute()
      
      // Record in history
      commandStore.recordCommand(command)
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      }
    }
  }, [userId, commandStore])
  
  /**
   * Undo the most recent operation.
   */
  const undo = useCallback(async (): Promise<CommandResult> => {
    const operation = commandStore.getMostRecentOperation()
    if (operation.length === 0) {
      return {
        success: false,
        error: new Error('No operation to undo'),
      }
    }
    
    // Reverse commands in reverse order
    const results: CommandResult[] = []
    let hasPartialReversals = false
    
    for (let i = operation.length - 1; i >= 0; i--) {
      const cmd = operation[i]
      if (cmd.reversible) {
        const result = await cmd.reverse()
        results.push(result)
        if (result.partialReversal) {
          hasPartialReversals = true
        }
        if (!result.success && !result.partialReversal) {
          // Stop on complete failure
          return result
        }
      }
    }
    
    // Remove operation from history
    commandStore.removeMostRecentOperation()
    
    return {
      success: true,
      partialReversal: hasPartialReversals
        ? {
            reason: 'Some commands had partial reversals',
            mergedFields: {},
            preservedFields: {},
          }
        : undefined,
    }
  }, [commandStore])
  
  /**
   * Redo the most recently undone operation.
   * (Implementation depends on redo stack management)
   */
  const redo = useCallback(async (): Promise<CommandResult> => {
    // TODO: Implement redo functionality
    return {
      success: false,
      error: new Error('Redo not yet implemented'),
    }
  }, [])
  
  return {
    execute,
    undo,
    redo,
    canUndo: commandStore.canUndo,
    canRedo: commandStore.canRedo,
  }
}
```

### 5. Command Factory

```typescript
/**
 * Factory for creating commands from action calls.
 * Wraps existing action hooks to use command pattern.
 */
export function useCommandFactory() {
  const { execute } = useCommandExecutor()
  const auth = db.useAuth()
  const userId = auth.user?.id || 'anonymous'
  
  // Wrap existing actions to use commands
  const createConceptCommand = useCallback(async (
    data: CreateConceptData
  ): Promise<CommandResult> => {
    const conceptId = id()
    const oldState = {} // No old state for create
    const newState = {
      label: data.label,
      positionX: data.position.x,
      positionY: data.position.y,
      notes: data.notes || '',
      metadata: JSON.stringify(data.metadata || {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    const command = new CreateCommand(
      'concept',
      conceptId,
      userId,
      '', // Will be set by store
      newState,
      { map: data.mapId },
      async () => {
        await db.transact([
          tx.concepts[conceptId]
            .update(newState)
            .link({ map: data.mapId }),
        ])
      }
    )
    
    return execute(command)
  }, [userId, execute])
  
  const updateConceptCommand = useCallback(async (
    conceptId: string,
    updates: UpdateConceptData
  ): Promise<CommandResult> => {
    // Need to fetch old state first
    const oldState = await fetchConceptState(conceptId)
    if (!oldState) {
      return {
        success: false,
        error: new Error('Concept not found'),
      }
    }
    
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }
    if (updates.label !== undefined) updateData.label = updates.label
    if (updates.position !== undefined) {
      updateData.positionX = updates.position.x
      updateData.positionY = updates.position.y
    }
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.metadata !== undefined) {
      updateData.metadata = JSON.stringify(updates.metadata)
    }
    
    const newState = { ...oldState, ...updateData }
    
    const command = new UpdateCommand(
      'concept',
      conceptId,
      userId,
      '',
      oldState,
      newState,
      async () => {
        await db.transact([tx.concepts[conceptId].update(updateData)])
      }
    )
    
    return execute(command)
  }, [userId, execute])
  
  // Similar wrappers for other operations...
  
  return {
    createConceptCommand,
    updateConceptCommand,
    // ... other command creators
  }
}

/**
 * Helper to fetch current entity state from InstantDB.
 */
async function fetchConceptState(conceptId: string): Promise<Record<string, unknown> | null> {
  // This would need to use db.useQuery or a similar mechanism
  // For now, placeholder
  return null
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create command interface and base types
- [ ] Implement core command classes (Create, Update, Delete, Link/Unlink)
- [ ] Create enhanced command store
- [ ] Set up command executor hook
- [ ] Add unit tests for command classes

### Phase 2: Integration (Week 3-4)
- [ ] Wrap existing concept actions with commands
- [ ] Wrap existing relationship actions with commands
- [ ] Update components to use command pattern
- [ ] Migrate undo system to use commands
- [ ] Add conflict detection for updates

### Phase 3: Advanced Features (Week 5-6)
- [ ] Implement partial reversals for concurrent modifications
- [ ] Add operation grouping for complex mutations
- [ ] Implement redo functionality
- [ ] Add command history persistence (localStorage)
- [ ] Create command history UI component

### Phase 4: Polish & Testing (Week 7-8)
- [ ] Add error handling and recovery
- [ ] Performance optimization for large histories
- [ ] Comprehensive testing (unit + integration)
- [ ] Documentation updates
- [ ] Migration guide for existing code

## Limitations & Constraints

### InstantDB Limitations
1. **No Native Undo**: InstantDB doesn't provide built-in undo/redo
2. **No Version History**: No native support for versioning entities
3. **Real-time Sync**: Changes propagate immediately, making conflict detection challenging
4. **Query Limitations**: Need to query current state before reversals, which adds latency
5. **Soft Delete Support**: Only concepts/relationships support soft deletes via `deletedAt`

### Multiplayer Constraints
1. **Concurrent Modifications**: Multiple users can modify same entity simultaneously
2. **Conflict Resolution**: Simple reversals may overwrite others' changes
3. **Partial Reversals**: Some operations can't be fully reversed without data loss
4. **Operation Ordering**: Command execution order may differ across clients
5. **Network Latency**: Undo operations may fail if state changed before reversal executes

### Technical Constraints
1. **State Fetching**: Need to query current state before reversals (performance cost)
2. **History Size**: Large command histories consume memory
3. **Type Safety**: Complex command types require careful TypeScript design
4. **Link Reversal**: Link/unlink operations need careful tracking
5. **Batch Operations**: Complex operations may span multiple entities

### Design Decisions
1. **Soft Deletes Only**: Hard deletes (maps, perspectives) may not be reversible
2. **Partial Reversals**: Prefer merging over failing when conflicts occur
3. **Operation Grouping**: Group related commands for logical undo units
4. **History Limits**: Cap history size to prevent memory issues
5. **Type-Specific Logic**: Different entity types need different reversal strategies

## Migration Strategy

### Backward Compatibility
- Keep existing action hooks (`useConceptActions`, etc.) as wrappers
- Gradually migrate components to use command pattern
- Maintain existing undo functionality during transition

### Incremental Rollout
1. **Phase 1**: Add command infrastructure alongside existing code
2. **Phase 2**: Migrate concept operations first (most used)
3. **Phase 3**: Migrate relationship operations
4. **Phase 4**: Migrate map/perspective operations
5. **Phase 5**: Remove old undo system

### Testing Strategy
- Unit tests for each command type
- Integration tests for conflict scenarios
- E2E tests for multiplayer undo/redo
- Performance tests for large histories

## Success Metrics

1. **Coverage**: All mutation types support undo/redo
2. **Conflicts**: Handle concurrent modifications gracefully (>90% success rate)
3. **Performance**: Undo operations complete in <500ms
4. **Usability**: Users can undo operations within 10 seconds of execution
5. **Stability**: No data loss during undo operations

## Future Enhancements

1. **Command History Persistence**: Save to localStorage/IndexedDB
2. **Cross-Device Sync**: Sync command history across devices (challenging)
3. **Command Visualization**: UI to view command history
4. **Selective Undo**: Undo specific commands rather than entire operations
5. **Command Macros**: Save and replay command sequences
6. **Conflict UI**: Show users when conflicts occur and allow manual resolution

## Conclusion

This command pattern implementation will provide a robust foundation for undo/redo functionality in the multiplayer InstantDB application. The design prioritizes handling concurrent modifications gracefully through partial reversals and conflict detection, while maintaining performance and type safety.

The phased implementation approach allows for incremental rollout and testing, ensuring backward compatibility during the transition period.
