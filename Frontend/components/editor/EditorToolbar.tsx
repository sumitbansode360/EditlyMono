"use client";

import { Editor } from "@tiptap/react";
import DocumentTitle from "./DocumentTitle";
import LastSaved from "./LastSaved";
import EditorMenuBar from "./EditorMenuBar";
import ShareDialog from "./ShareDialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Save, User, Settings, LogOut } from "lucide-react";
import { User as AppUser } from "@/types/auth";
import { DocumentAccessRole } from "@/types/collaboration";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

interface Props {
  editor: Editor | null;
  docTitle: string;
  onTitleChange: (title: string) => void;
  lastSaved: Date | null;
  isSaving: boolean;
  onSave: () => void;
  user: AppUser;
  documentId: string;
  role: DocumentAccessRole | null;
}

function getInitials(user: AppUser): string {
  const fromName = `${user.first_name} ${user.last_name}`
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (fromName) return fromName;
  return user.email.slice(0, 2).toUpperCase();
}

export default function EditorToolbar({
  editor,
  docTitle,
  onTitleChange,
  lastSaved,
  isSaving,
  onSave,
  user,
  documentId,
  role,
}: Props) {
  const { logout } = useUser();
  const router = useRouter();

  const isOwner = role === "owner";
  const isReadOnly = role === "viewer";

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="flex flex-col bg-background border-b border-border shadow-sm z-10 flex-shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded bg-foreground flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                className="fill-background"
              />
              <path
                d="M14 2v6h6M8 13h8M8 17h5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                className="stroke-background"
              />
            </svg>
          </div>

          <div className="flex flex-col min-w-0">
            <DocumentTitle value={docTitle} onChange={onTitleChange} readOnly={isReadOnly} />
            <LastSaved lastSaved={lastSaved} isSaving={isSaving} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Only the owner can invite — matches the backend, which 404s
              an invite call from anyone else. */}
          {isOwner && <ShareDialog documentId={documentId} documentTitle={docTitle} />}

          {/* Non-owners see what access level they have instead. */}
          {!isOwner && role && (
            <RoleBadge role={role} className="h-7 px-2.5 flex items-center" />
          )}

          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="h-7 gap-1.5 text-xs"
            >
              <Save className="w-3 h-3" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-transparent hover:ring-border transition-all">
                <AvatarImage src={user.profile_pic ?? undefined} alt={user.email} />
                <AvatarFallback className="bg-muted text-foreground text-xs font-semibold select-none">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-sm cursor-pointer"
                onClick={() => router.push("/profile")}
              >
                <User className="w-3.5 h-3.5" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-sm cursor-pointer"
                onClick={() => router.push("/settings")}
              >
                <Settings className="w-3.5 h-3.5" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Separator />
      {!isReadOnly && <EditorMenuBar editor={editor} />}
    </div>
  );
}
