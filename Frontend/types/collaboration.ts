// --- Live presence (Yjs / WebSocket awareness) ---
// Who's currently viewing/editing this document right now, in this session.
export interface CollaborationUser {
  // Stable identity, independent of which tab/connection it came from.
  // This is what the online-users list dedupes on — without it, the same
  // person open in two tabs shows up as two separate people.
  id: string;
  name: string;
  color: string;
  profile_pic?: string | null;
}

export interface OnlineUser extends CollaborationUser {
  // The representative Yjs connection id for this person (whichever
  // connection is currently "picked" to represent them in the list).
  // Useful as a React key / for debugging — not used for de-duplication,
  // `id` is.
  clientId: number;
  isCurrentUser: boolean;
  // >1 means this person has the document open in more than one tab.
  sessionCount: number;
}

// --- Document sharing (REST API) ---
// Who has been *granted access* to this document, independent of whether
// they're online right now. Comes from /api/collaborations/.
export type CollaboratorRole = "editor" | "viewer";
export type CollaboratorStatus = "pending" | "active";

// The caller's own access level on a document — "owner" is not a role you
// can invite someone as, it's derived server-side from Document.owner.
export type DocumentAccessRole = "owner" | CollaboratorRole;

export interface DocumentCollaborator {
  id: string;
  document: string;
  email: string;
  name: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  invited_at: string;
  accepted_at: string | null;
}

export interface InviteCollaboratorPayload {
  document_id: string;
  email: string;
  role: CollaboratorRole;
}
