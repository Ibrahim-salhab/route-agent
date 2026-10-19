import {
  DocumentDeleteResponse,
  DocumentUploadResponse,
  HealthResponse,
  IndexedDocumentsResponse,
  QueryRequest,
  QueryResponse,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  public status: number;
  public detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    let detail: string | undefined;

    if (isJson) {
      try {
        const errorBody = await response.json();
        if (typeof errorBody.detail === 'string') {
          detail = errorBody.detail;
          errorMessage = errorBody.detail;
        } else if (Array.isArray(errorBody.detail)) {
          // Validation error list from FastAPI
          const joined = errorBody.detail.map((d: { msg: string }) => d.msg).join('; ');
          detail = joined;
          errorMessage = joined;
        } else if (typeof errorBody.error === 'string') {
          detail = errorBody.error;
          errorMessage = errorBody.error;
        }
      } catch {
        // Fallback to generic message if parsing fails
      }
    } else {
      try {
        const text = await response.text();
        if (text) {
          detail = text;
          errorMessage = text;
        }
      } catch {
        // Ignore text extraction error
      }
    }

    throw new ApiError(errorMessage, response.status, detail);
  }

  if (!isJson) {
    throw new ApiError('Expected JSON response from server', response.status);
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    throw new ApiError('Failed to parse server response as JSON', response.status, String(err));
  }
}

/**
 * Execute research agent query.
 */
export async function queryAgent(
  query: string,
  signal?: AbortSignal
): Promise<QueryResponse> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    throw new ApiError(
      'Query must be at least 3 characters long.',
      422,
      'Query must be at least 3 characters long after trimming.'
    );
  }

  const payload: QueryRequest = { query: trimmed };

  try {
    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    return await handleResponse<QueryResponse>(response);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out or was cancelled.', 408);
    }
    throw new ApiError(
      `Network connection error: ${err instanceof Error ? err.message : 'Failed to reach server'}`,
      0
    );
  }
}

/**
 * Upload and ingest a document into the ChromaDB vector store.
 * Supported file types: .pdf, .txt, .md
 */
export async function uploadDocument(
  file: File,
  signal?: AbortSignal
): Promise<DocumentUploadResponse> {
  const allowedExtensions = ['.pdf', '.txt', '.md'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    throw new ApiError(
      `Unsupported file type '${ext}'. Allowed: .pdf, .txt, .md`,
      400
    );
  }

  if (file.size === 0) {
    throw new ApiError(`Uploaded file '${file.name}' is empty.`, 400);
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
      signal,
    });

    return await handleResponse<DocumentUploadResponse>(response);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Upload timed out or was cancelled.', 408);
    }
    throw new ApiError(
      `Network connection error: ${err instanceof Error ? err.message : 'Failed to reach server'}`,
      0
    );
  }
}

/**
 * Health readiness check for API, ChromaDB vector store, embeddings, and LLM configuration.
 */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    return await handleResponse<HealthResponse>(response);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      `Health check failed: ${err instanceof Error ? err.message : 'Unable to reach backend'}`,
      0
    );
  }
}

/**
 * Fetch all documents currently indexed in the vector store.
 */
export async function fetchIndexedDocuments(signal?: AbortSignal): Promise<IndexedDocumentsResponse> {
  try {
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    return await handleResponse<IndexedDocumentsResponse>(response);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      `Failed to fetch indexed documents: ${err instanceof Error ? err.message : 'Unknown error'}`,
      0
    );
  }
}

/**
 * Delete a specific document from the vector store by filename.
 */
export async function deleteDocument(
  filename: string,
  signal?: AbortSignal
): Promise<DocumentDeleteResponse> {
  try {
    const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
      signal,
    });

    return await handleResponse<DocumentDeleteResponse>(response);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      `Failed to delete document: ${err instanceof Error ? err.message : 'Unknown error'}`,
      0
    );
  }
}

/**
 * Delete all documents from the vector store.
 */
export async function clearAllDocuments(signal?: AbortSignal): Promise<DocumentDeleteResponse> {
  try {
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
      signal,
    });

    return await handleResponse<DocumentDeleteResponse>(response);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      `Failed to clear vector store: ${err instanceof Error ? err.message : 'Unknown error'}`,
      0
    );
  }
}
