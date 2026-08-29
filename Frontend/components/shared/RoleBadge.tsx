import { Badge } from "@/components/ui/badge";
import { DocumentAccessRole } from "@/types/collaboration";

interface Props {
  role: DocumentAccessRole | null;
  className?: string;
}

const LABELS: Record<DocumentAccessRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

/**
 * Small role indicator. Use on:
 *  - the editor toolbar (non-owners see "Editor access" / "Viewer access")
 *  - dashboard document cards/rows, once DocumentGrid/DocumentListItem
 *    read `document.role` (not wired up yet — see note in the writeup).
 */
export function RoleBadge({ role, className }: Props) {
  if (!role) return null;

  return (
    <Badge
      variant={role === "owner" ? "default" : "secondary"}
      className={`text-[10px] capitalize ${className ?? ""}`}
    >
      {LABELS[role]}
    </Badge>
  );
}
