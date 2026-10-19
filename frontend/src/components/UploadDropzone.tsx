import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { formatFileSize } from '../lib/utils';

interface UploadDropzoneProps {
  onUpload: (file: File) => Promise<unknown>;
  isUploading: boolean;
  error: string | null;
  onClearError?: () => void;
}

const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md'];

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onUpload,
  isUploading,
  error,
  onClearError,
}) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = async (file: File) => {
    setValidationError(null);
    onClearError?.();

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setValidationError(`Unsupported format "${ext}". Please upload a .pdf, .txt, or .md document.`);
      return;
    }

    if (file.size === 0) {
      setValidationError(`The selected file "${file.name}" is empty (0 bytes).`);
      return;
    }

    // 25MB safety limit
    if (file.size > 25 * 1024 * 1024) {
      setValidationError('File size exceeds the 25MB limit.');
      return;
    }

    setSelectedFile(file);
    await onUpload(file);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await validateAndProcessFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await validateAndProcessFile(file);
    }
  };

  const currentError = validationError || error;

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload document dropzone: drag and drop files or click to browse"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-all duration-base ease-coda cursor-pointer text-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          isDragOver
            ? 'border-primary bg-neutral-50 scale-[1.01]'
            : 'border-coda-border hover:border-primary bg-white'
        } ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,text/plain,application/pdf,text/markdown"
          onChange={handleFileInputChange}
          disabled={isUploading}
          className="hidden"
          aria-hidden="true"
        />

        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-primary" />
          )}
        </div>

        {isUploading ? (
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary tracking-body">
              Chunking & Embedding Document...
            </p>
            {selectedFile && (
              <p className="text-xs text-text-muted font-mono">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary tracking-body">
              Click to upload or drag & drop
            </p>
            <p className="text-xs text-text-muted tracking-body">
              PDF, TXT, or Markdown documents (max 25MB)
            </p>
          </div>
        )}
      </div>

      {currentError && (
        <div className="p-3 rounded-md bg-neutral-100 border-l-4 border-primary flex items-start space-x-2 text-xs text-primary animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{currentError}</div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          Local ChromaDB vector persistence
        </span>
        <span>CPU embeddings</span>
      </div>
    </div>
  );
};
