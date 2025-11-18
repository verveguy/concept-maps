/**
 * Confirmation dialog for deleting a perspective.
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

interface DeletePerspectiveDialogProps {
  perspectiveToDelete: { id: string; name: string; mapId: string } | null
  onOpenChange: (open: boolean) => void
  onConfirm: (perspectiveId: string) => void
}

export const DeletePerspectiveDialog = memo(({ perspectiveToDelete, onOpenChange, onConfirm }: DeletePerspectiveDialogProps) => {
  return (
    <AlertDialog open={!!perspectiveToDelete} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Perspective</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{perspectiveToDelete?.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => perspectiveToDelete && onConfirm(perspectiveToDelete.id)}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})

DeletePerspectiveDialog.displayName = 'DeletePerspectiveDialog'

