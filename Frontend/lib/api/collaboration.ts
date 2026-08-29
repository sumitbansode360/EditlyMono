import api from "@/lib/axios";
import {
  CollaboratorRole,
  DocumentCollaborator,
} from "@/types/collaboration";

/**
 * Invites (or re-invites) a collaborator by email.
 *
 * Works whether or not the email belongs to a registered user yet — the
 * backend figures out which of the three cases applies. Calling this again
 * for the same email on the same document resends the invite / updates the
 * role instead of failing, so this same function covers both "invite" and
 * "resend" in the UI.
 */
export const inviteCollaborator = async (
  documentId: string,
  email: string,
  role: CollaboratorRole
): Promise<DocumentCollaborator> => {
  try {
    const response = await api.post<DocumentCollaborator>(
      "/api/collaborations/",
      { document_id: documentId, email, role }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to send invite"
    );
  }
};

/**
 * Lists collaborators (including still-pending invites) for a document.
 * Only the document owner can call this — the backend scopes
 * /api/collaborations/ to documents you own.
 */
export const getCollaborators = async (
  documentId: string
): Promise<DocumentCollaborator[]> => {
  try {
    const response = await api.get<DocumentCollaborator[]>(
      "/api/collaborations/",
      { params: { document_id: documentId } }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to load collaborators"
    );
  }
};

/**
 * Revokes a collaborator's access.
 */
export const removeCollaborator = async (
  collaborationId: string
): Promise<void> => {
  try {
    await api.delete(`/api/collaborations/${collaborationId}/`);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to remove collaborator"
    );
  }
};
