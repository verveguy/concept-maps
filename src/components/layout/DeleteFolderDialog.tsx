/**
 * Confirmation dialog for deleting a folder.
 */

import { memo } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteFolderDialogProps {
  folderToDelete: { id: string; name: string } | null
  onOpenChange: (open: boolean) => void
  onConfirm: (folderId: string) => void
}

export const DeleteFolderDialog = memo(({ folderToDelete, onOpenChange, onConfirm }: DeleteFolderDialogProps) => {
  return (
    <AlertDialog open={!!folderToDelete} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Folder</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{folderToDelete?.name}"? Maps in this folder will not be deleted, only the folder organization will be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => folderToDelete && onConfirm(folderToDelete.id)}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})

DeleteFolderDialog.displayName = 'DeleteFolderDialog'

