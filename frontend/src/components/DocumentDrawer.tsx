import React from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Database, Layers, Trash2 } from 'lucide-react';
import { UploadedDocument } from '../types/api';
import { UploadDropzone } from './UploadDropzone';
import { formatTime } from '../lib/utils';

interface DocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: UploadedDocument[];
  isUploading: boolean;
  isDeleting?: boolean;
  uploadError: string | null;
  onUploadFile: (file: File) => Promise<unknown>;
  onRemoveDocument?: (filename: string) => Promise<unknown>;
  onRemoveAllDocuments?: () => Promise<unknown>;
  onClearError: () => void;
  totalChunksIndexed: number;
}

export const DocumentDrawer: React.FC<DocumentDrawerProps> = ({
  isOpen,
  onClose,
  documents,
  isUploading,
  isDeleting = false,
  uploadError,
  onUploadFile,
  onRemoveDocument,
  onRemoveAllDocuments,
  onClearError,
  totalChunksIndexed,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-base ease-coda"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-elevated flex flex-col justify-between border-l border-neutral-200 animate-slideLeft">
          {/* Drawer Header */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary tracking-body">
                    Knowledge Base
                  </h3>
                  <p className="text-xs text-text-muted">
                    Private document collection
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-text-muted hover:text-primary hover:bg-neutral-100 transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close document drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Knowledge Stats Banner */}
            <div className="mt-4 p-3 rounded-md bg-neutral-50 flex items-center justify-between text-xs border border-neutral-200">
              <div className="flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-text-muted" />
                <span className="font-semibold text-primary">
                  {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-text-muted" />
                <span className="font-mono font-bold text-primary">
                  {totalChunksIndexed} Chunks
                </span>
              </div>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Upload Area */}
            <section aria-labelledby="upload-section-title">
              <h4 id="upload-section-title" className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                Ingest New Document
              </h4>
              <UploadDropzone
                onUpload={onUploadFile}
                isUploading={isUploading}
                error={uploadError}
                onClearError={onClearError}
              />
            </section>

            {/* Ingested Documents List */}
            <section aria-labelledby="documents-section-title">
              <div className="flex items-center justify-between mb-2">
                <h4 id="documents-section-title" className="text-xs font-bold text-primary uppercase tracking-wider">
                  Indexed Documents
                </h4>
                {documents.length > 0 && onRemoveAllDocuments && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to remove all indexed documents from the vector store?')) {
                        onRemoveAllDocuments();
                      }
                    }}
                    disabled={isDeleting}
                    className="text-xs font-semibold text-neutral-500 hover:text-red-600 transition-colors flex items-center gap-1 focus:outline-none"
                    title="Clear all documents from ChromaDB"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {documents.length === 0 ? (
                <div className="p-6 rounded-md bg-neutral-50 text-center border border-dashed border-neutral-300">
                  <FileText className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-primary">No documents indexed yet</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Upload .pdf, .txt, or .md files to empower vector retrieval.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-md bg-white shadow-card hover:shadow-elevated transition-all duration-fast ease-coda flex items-start justify-between gap-2"
                    >
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <div className="p-2 rounded bg-neutral-100 text-primary flex-shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-primary truncate tracking-body" title={doc.filename}>
                            {doc.filename}
                          </p>
                          <div className="flex items-center space-x-2 mt-1 text-[11px] text-text-muted">
                            <span>{formatTime(doc.uploaded_at)}</span>
                            <span>•</span>
                            <span className="font-mono">{doc.chunks_indexed} chunks</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center space-x-2">
                        {doc.status === 'indexed' && (
                          <span className="inline-flex items-center space-x-1 text-[11px] text-primary font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Indexed</span>
                          </span>
                        )}
                        {doc.status === 'uploading' && (
                          <span className="text-[11px] text-text-muted font-medium animate-pulse">
                            Processing...
                          </span>
                        )}
                        {doc.status === 'error' && (
                          <span className="inline-flex items-center space-x-1 text-[11px] text-red-600 font-medium" title={doc.errorMessage}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Failed</span>
                          </span>
                        )}

                        {onRemoveDocument && doc.status === 'indexed' && (
                          <button
                            type="button"
                            onClick={() => onRemoveDocument(doc.filename)}
                            disabled={isDeleting}
                            className="p-1.5 rounded text-neutral-400 hover:text-red-600 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
                            title={`Delete ${doc.filename} from vector store`}
                            aria-label={`Delete ${doc.filename}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-neutral-200 bg-neutral-50 text-[11px] text-text-muted text-center">
            Synchronized with local ChromaDB vector store
          </div>
        </div>
      </div>
    </div>
  );
};
