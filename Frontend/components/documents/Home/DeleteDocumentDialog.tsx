"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "@/lib/api/document";
import { DocumentListItem as DocType } from "@/types/document";
import { Loader2, AlertTriangle } from "lucide-react";
import { useDocuments } from "@/context/DocumentContext";

interface DeleteDocumentDialogProps {
  document: DocType;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDocumentDialog({
  document,
  isOpen,
  onOpenChange,
}: DeleteDocumentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { fetchDocs } = useDocuments();

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await deleteDocument(document.id);
      await fetchDocs();
      toast.success("Document deleted successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[400px]"
        onClick={(e: any) => e.stopPropagation()}
      >
        <DialogHeader className="flex flex-col items-center gap-2 pt-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-xl text-center">Delete Document</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Are you sure you want to delete <span className="font-semibold text-foreground">"{document.title}"</span>? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 h-10 hover:cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 h-10 hover:cursor-pointer"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}