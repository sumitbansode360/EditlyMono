"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDocument } from "@/lib/api/document";
import { DocumentListItem as DocType } from "@/types/document";
import { Loader2 } from "lucide-react";
import { useDocuments } from "@/context/DocumentContext";

interface RenameDocumentDialogProps {
  document: DocType;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameDocumentDialog({
  document,
  isOpen,
  onOpenChange,
}: RenameDocumentDialogProps) {
  const [title, setTitle] = useState(document.title);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchDocs } = useDocuments();

  // Sync title with document prop when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle(document.title);
    }
  }, [isOpen, document.title]);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      toast.error("Title cannot be empty");
      return;
    }

    if (trimmedTitle === document.title) {
      onOpenChange(false);
      return;
    }

    try {
      setIsLoading(true);
      await updateDocument(document.id, { title: trimmedTitle });
      await fetchDocs();
      toast.success("Document renamed successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to rename document");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        onClick={(e: any) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Rename Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleRename} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label
              htmlFor="title"
              className="text-xs font-semibold text-muted-foreground uppercase"
            >
              New Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              autoFocus
            />
          </div>
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
              type="submit"
              disabled={isLoading || !title.trim() || title === document.title}
              className="flex-1 h-10 hover:cursor-pointer"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
