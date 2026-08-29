"use client";

import { useState } from "react";
import {
  Calendar,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  User,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils/formatDate";
import Link from "next/link";

import { DocumentListItem as DocType } from "@/types/document";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { RenameDocumentDialog } from "./RenameDocumentDialog";
import { DeleteDocumentDialog } from "./DeleteDocumentDialog";

type Props = {
  document: DocType;
};

export function DocumentListItem({ document }: Props) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Owner and editors can rename (matches the backend's has_edit_permission
  // check); only the owner can delete. A viewer gets neither — showing them
  // an action that would just 403 isn't a kindness.
  const canRename = document.role === "owner" || document.role === "editor";
  const canDelete = document.role === "owner";
  // "Owner" on every one of your own cards is just noise — only worth
  // surfacing the role when it's telling you something you don't already
  // know, i.e. a document that isn't yours.
  const showRoleBadge = document.role && document.role !== "owner";

  return (
    <>
      <Card className="group overflow-hidden rounded-xl border bg-background transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-4">
            {/* FILE ICON */}
            <Link href={`/documents/${document.id}`} className="flex flex-1 items-center gap-4 min-w-0">
              <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>

              {/* DOCUMENT INFO */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-4">
                  <h3 className="line-clamp-1 text-sm font-medium">
                    {document.title}
                  </h3>
                  {showRoleBadge && (
                    <RoleBadge role={document.role} className="flex-shrink-0" />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{document.owner_name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Updated {formatDate(document.updated_at)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Created {formatDate(document.created_at)}</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* ACTIONS */}
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  onClick={(e) => e.stopPropagation()}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52 rounded-xl">
                <DropdownMenuLabel>Document Actions</DropdownMenuLabel>

                <DropdownMenuSeparator />
                {canRename && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsRenameOpen(true); // Open the dialog
                      setIsDropdownOpen(false); // Close the dropdown menu
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                )}
                <Link href={`/documents/${document.id}`}>
                  <DropdownMenuItem className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    Open Document
                  </DropdownMenuItem>
                </Link>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="cursor-pointer text-red-500 focus:text-red-500"
                      onSelect={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDeleteOpen(true);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
      <RenameDocumentDialog
        document={document}
        isOpen={isRenameOpen}
        onOpenChange={(open) => {
          setIsRenameOpen(open);
          if (!open) setIsDropdownOpen(false); // Ensure dropdown closes if dialog is dismissed
        }}
      />
      <DeleteDocumentDialog
        document={document}
        isOpen={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setIsDropdownOpen(false);
        }}
      />
    </>
  );
}
