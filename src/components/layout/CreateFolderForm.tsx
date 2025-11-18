/**
 * Form component for creating a new folder.
 */

import { memo } from 'react'

interface CreateFolderFormProps {
  folderName: string
  onFolderNameChange: (name: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export const CreateFolderForm = memo(({
  folderName,
  onFolderNameChange,
  onSubmit,
  onCancel,
}: CreateFolderFormProps) => {
  return (
    <div className="px-2">
      <form onSubmit={onSubmit} className="flex items-center gap-1">
        <input
          type="text"
          value={folderName}
          onChange={(e) => onFolderNameChange(e.target.value)}
          placeholder="Folder name..."
          className="px-2 py-1 text-xs border rounded-md w-32"
          autoFocus
          onBlur={() => {
            if (!folderName.trim()) {
              onCancel()
            }
          }}
        />
        <button
          type="submit"
          disabled={!folderName.trim()}
          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs border rounded-md hover:bg-accent"
        >
          Cancel
        </button>
      </form>
    </div>
  )
})

CreateFolderForm.displayName = 'CreateFolderForm'

