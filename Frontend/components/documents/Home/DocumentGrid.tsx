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
import { formatDate } from "@/lib/utils/formatDate";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

import { DocumentListItem as DocType } from "@/types/document";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { RenameDocumentDialog } from "./RenameDocumentDialog";
import { DeleteDocumentDialog } from "./DeleteDocumentDialog";

type Props = {
  document: DocType;
};

export function DocumentGrid({ document }: Props) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const canRename = document.role === "owner" || document.role === "editor";
  const canDelete = document.role === "owner";
  // "Owner" on every one of your own cards is just noise — only worth
  // surfacing the role when it's telling you something you don't already
  // know, i.e. a document that isn't yours.
  const showRoleBadge = document.role && document.role !== "owner";

  return (
    <>
      <Card className="group w-full overflow-hidden rounded-lg border bg-background p-0 transition-all duration-200 hover:border-primary/50 hover:shadow-md">
        <CardContent className="p-0 relative">
          {/* ACTION MENU - Moved outside Link and given higher z-index */}
          <div className="absolute right-3 top-3 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  onClick={(e) => e.stopPropagation()}
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-lg shadow-sm cursor-pointer"
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
                      setIsDropdownOpen(false);
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

          <Link href={`/documents/${document.id}`} className="block">
            {/* DOCUMENT PREVIEW */}
            <div className="relative">
              <div className="relative h-44 overflow-hidden border-b bg-muted/20 p-3">
                {/* DOCUMENT PAPER */}
                <div className="mx-auto h-full w-[90%] rounded-sm border bg-background shadow-sm transition-transform duration-300 group-hover:scale-[1.01]">
                  {/* DOCUMENT HEADER */}
                  <div className="border-b px-3 py-2">
                    <div className="h-2.5 w-20 rounded bg-muted-foreground/20" />
                  </div>

                  {/* DOCUMENT CONTENT */}
                  <div className="space-y-1.5 p-3">
                    <div className="h-1.5 w-full rounded bg-muted-foreground/10" />

                    <div className="h-1.5 w-[90%] rounded bg-muted-foreground/10" />

                    <div className="h-1.5 w-[75%] rounded bg-muted-foreground/10" />

                    <div className="pt-3">
                      <div className="h-1.5 w-[65%] rounded bg-muted-foreground/10" />
                    </div>

                    <div className="h-1.5 w-full rounded bg-muted-foreground/10" />

                    <div className="h-1.5 w-[80%] rounded bg-muted-foreground/10" />

                    <div className="h-1.5 w-[55%] rounded bg-muted-foreground/10" />
                  </div>
                </div>
              </div>
            </div>

            {/* FILE INFO */}
            <div className="space-y-2 p-3">
              {/* TITLE */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="line-clamp-1 text-[13px] font-medium leading-none min-w-0 flex-1">
                    {document.title}
                  </h3>
                  {showRoleBadge && (
                    <RoleBadge role={document.role} className="flex-shrink-0" />
                  )}
                </div>

                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Updated {formatDate(document.updated_at)}
                </p>
              </div>

              {/* METADATA */}
              <div className="space-y-1 border-t pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />

                  <span className="line-clamp-1 text-[11px]">
                    {document.owner_name}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />

                  <span className="text-[11px]">
                    Created {formatDate(document.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
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