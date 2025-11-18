/**
 * Confirmation dialog for deleting a map.
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

interface DeleteMapDialogProps {
  mapToDelete: { id: string; name: string } | null
  onOpenChange: (open: boolean) => void
  onConfirm: (mapId: string) => void
}

export const DeleteMapDialog = memo(({ mapToDelete, onOpenChange, onConfirm }: DeleteMapDialogProps) => {
  return (
    <AlertDialog open={!!mapToDelete} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Map</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{mapToDelete?.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mapToDelete && onConfirm(mapToDelete.id)}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})

DeleteMapDialog.displayName = 'DeleteMapDialog'

