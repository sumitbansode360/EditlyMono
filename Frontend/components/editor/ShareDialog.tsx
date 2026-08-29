"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getCollaborators, inviteCollaborator } from "@/lib/api/collaboration";
import { CollaboratorRole, DocumentCollaborator } from "@/types/collaboration";

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
}

function getInitials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const fromParts = source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return fromParts || email.slice(0, 2).toUpperCase();
}

export default function ShareDialog({ documentId, documentTitle }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const [isSending, setIsSending] = useState(false);
  const [collaborators, setCollaborators] = useState<DocumentCollaborator[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const loadCollaborators = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const data = await getCollaborators(documentId);
      setCollaborators(data);
    } catch (error) {
      // Non-fatal — the invite form still works even if the list fails to load.
      console.error("Failed to load collaborators", error);
    } finally {
      setIsLoadingList(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) {
      loadCollaborators();
    }
  }, [open, loadCollaborators]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsSending(true);
    try {
      // Same call handles first-time invite and resend — the backend
      // upserts on (document, email), so there's no separate "resend"
      // action needed in the UI.
      await inviteCollaborator(documentId, trimmed, role);
      toast.success(`Invite sent to ${trimmed}`);
      setEmail("");
      setOpen(false);    
      loadCollaborators();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <UserPlus className="w-3.5 h-3.5" />
          Share
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">Share &quot;{documentTitle}&quot;</DialogTitle>
          <DialogDescription>
            Invite someone by email. They don&apos;t need an Editly account yet —
            we&apos;ll walk them through creating one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs">
              Email address
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSending}
              required
            />
          </div>

          <div className="w-28 space-y-1.5">
            <Label htmlFor="invite-role" className="text-xs">
              Role
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as CollaboratorRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isSending || !email.trim()} className="h-9">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
          </Button>
        </form>

        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">People with access</p>

          {isLoadingList ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading…
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No collaborators yet — invite someone above.
            </p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {collaborators.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    <AvatarFallback className="text-[10px] font-semibold bg-muted">
                      {getInitials(c.name, c.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{c.name || c.email}</p>
                    {c.name && (
                      <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                    )}
                  </div>

                  <Badge variant="secondary" className="text-[10px] capitalize flex-shrink-0">
                    {c.role}
                  </Badge>

                  {c.status === "pending" && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      Pending
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
