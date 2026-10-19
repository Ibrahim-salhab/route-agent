import { useState, useCallback, useEffect } from 'react';
import { UploadedDocument, DocumentUploadResponse } from '../types/api';
import {
  uploadDocument,
  fetchIndexedDocuments,
  deleteDocument,
  clearAllDocuments,
  ApiError,
} from '../lib/api';

export function useDocuments() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync state with backend vector store on mount
  const refreshDocuments = useCallback(async () => {
    try {
      const data = await fetchIndexedDocuments();
      setDocuments(
        data.documents.map((doc) => ({
          id: doc.filename,
          filename: doc.filename,
          chunks_indexed: doc.chunks_count,
          uploaded_at: new Date(),
          status: 'indexed',
        }))
      );
    } catch {
      // Backend may be starting up; ignore initial sync error
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  const uploadFile = useCallback(async (file: File): Promise<DocumentUploadResponse | null> => {
    setUploadError(null);
    setIsUploading(true);

    const tempId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const tempDoc: UploadedDocument = {
      id: tempId,
      filename: file.name,
      chunks_indexed: 0,
      uploaded_at: new Date(),
      status: 'uploading',
    };

    setDocuments((prev) => [tempDoc, ...prev.filter((d) => d.filename !== file.name)]);

    try {
      const result = await uploadDocument(file);

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === tempId
            ? {
                ...doc,
                status: 'indexed',
                chunks_indexed: result.chunks_indexed,
                filename: result.filename,
              }
            : doc
        )
      );

      // Re-sync with backend to ensure accurate chunk totals
      await refreshDocuments();

      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.detail || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to upload document.';

      setUploadError(message);

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === tempId
            ? {
                ...doc,
                status: 'error',
                errorMessage: message,
              }
            : doc
        )
      );

      return null;
    } finally {
      setIsUploading(false);
    }
  }, [refreshDocuments]);

  const removeDocument = useCallback(async (filename: string): Promise<boolean> => {
    setIsDeleting(true);
    setUploadError(null);
    try {
      await deleteDocument(filename);
      setDocuments((prev) => prev.filter((d) => d.filename !== filename));
      await refreshDocuments();
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.detail || err.message
          : err instanceof Error
          ? err.message
          : `Failed to delete document '${filename}'.`;
      setUploadError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [refreshDocuments]);

  const removeAllDocuments = useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    setUploadError(null);
    try {
      await clearAllDocuments();
      setDocuments([]);
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.detail || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to clear documents.';
      setUploadError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setUploadError(null);
  }, []);

  const totalChunksIndexed = documents
    .filter((doc) => doc.status === 'indexed')
    .reduce((sum, doc) => sum + doc.chunks_indexed, 0);

  return {
    documents,
    isUploading,
    isDeleting,
    uploadError,
    totalChunksIndexed,
    uploadFile,
    removeDocument,
    removeAllDocuments,
    refreshDocuments,
    clearError,
  };
}
