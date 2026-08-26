import api from "@/lib/axios";
import {
  Document,
  DocumentListItem,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  PaginatedDocumentsResponse,
} from "@/types/document";

/**
 * Fetches a list of documents owned by the current user.
 * Returns a paginated response with document list items.
 */
export const getDocuments = async (
  page: number = 1,
  pageSize: number = 18
): Promise<PaginatedDocumentsResponse> => {
  try {
    const response = await api.get<PaginatedDocumentsResponse>("/api/documents/", {
      params: { page, page_size: pageSize }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to fetch documents list"
    );
  }
};

/**
 * Fetches the full details of a specific document, including its content.
 * @param id - The UUID of the document.
 */
export const getDocument = async (id: string): Promise<Document> => {
  try {
    const response = await api.get<Document>(`/api/documents/${id}/`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to fetch document details"
    );
  }
};

/**
 * Creates a new document.
 * @param data - The title and initial content for the document.
 */
export const createDocument = async (
  data: CreateDocumentRequest
): Promise<{
  message: string;
  id: string;
  data: Document;
}> => {
  try {
    const response = await api.post("/api/documents/", data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to create document"
    );
  }
};

/**
 * Updates an existing document's title or content.
 * Uses PATCH for partial updates.
 * @param id - The UUID of the document.
 * @param data - The fields to update.
 */
export const updateDocument = async (
  id: string,
  data: UpdateDocumentRequest
): Promise<Document> => {
  try {
    const response = await api.patch<Document>(`/api/documents/${id}/`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to update document"
    );
  }
};

/**
 * Replaces a document's title and content.
 * Uses PUT for full updates (e.g. manual save from the editor).
 * @param id - The UUID of the document.
 * @param data - The fields to save.
 */
export const putDocument = async (
  id: string,
  data: UpdateDocumentRequest
): Promise<Document> => {
  try {
    const response = await api.put<Document>(`/api/documents/${id}/`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to save document"
    );
  }
};

/**
 * Deletes a document by its ID.
 */
export const deleteDocument = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/documents/${id}/`);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to delete document"
    );
  }
};

/**
 * Searches documents by title or owner name.
 * @param query - Search query (minimum 3 characters)
 */
export const searchDocuments = async (
  query: string
): Promise<{ results: Array<{ id: string; title: string; owner_name: string; created_at: string; updated_at: string }> }> => {
  try {
    const response = await api.get("/api/documents/search/", {
      params: { q: query }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to search documents"
    );
  }
};