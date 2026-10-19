/**
 * Route Agent — Frontend Types & API Contracts
 * Fully aligned with backend/app/models/schemas.py and Agent.md specification.
 */

export type SourceType = 'internal' | 'web';

export type ToolRoute = 'internal_search' | 'web_search' | 'direct_reasoning' | string;

export interface SourceItem {
  title: string;
  url?: string | null;
  filename?: string | null;
  page_number?: number | null;
  snippet: string;
  source_type: SourceType;
  score?: number | null;
}

export interface QueryRequest {
  query: string;
}

export interface QueryResponse {
  answer: string;
  sources: SourceItem[];
  latency_ms: number;
  tool_used: ToolRoute;
}

export interface DocumentUploadResponse {
  status: string;
  chunks_indexed: number;
  filename: string;
}

export interface IndexedDocumentItem {
  filename: string;
  chunks_count: number;
}

export interface IndexedDocumentsResponse {
  documents: IndexedDocumentItem[];
  total_chunks: number;
}

export interface DocumentDeleteResponse {
  status: string;
  message: string;
  filename?: string | null;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  api: string;
  vector_store: string;
  embedding_service: string;
  llm_provider: string;
  llm_model: string;
}

export interface ApiErrorResponse {
  error?: string;
  detail?: string | Array<{ loc: (string | number)[]; msg: string; type: string }>;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceItem[];
  latency_ms?: number;
  tool_used?: ToolRoute;
  timestamp: Date;
  error?: string;
}

export interface UploadedDocument {
  id: string;
  filename: string;
  chunks_indexed: number;
  uploaded_at: Date;
  status: 'indexed' | 'uploading' | 'error';
  errorMessage?: string;
}
