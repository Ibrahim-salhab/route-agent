import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onOpenUpload: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onOpenUpload,
  isLoading,
  disabled = false,
}) => {
  const [input, setInput] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed.length < 3 || isLoading || disabled) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const canSubmit = input.trim().length >= 3 && !isLoading && !disabled;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2">
      <div className="relative rounded-lg bg-white shadow-card focus-within:ring-2 focus-within:ring-primary focus-within:shadow-elevated transition-all duration-base ease-coda p-2.5">
        <label htmlFor="agent-query-input" className="sr-only">
          Ask Route Agent a research question or search uploaded documents
        </label>
        <textarea
          id="agent-query-input"
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or search your uploaded documents... (Enter to send, Shift + Enter for new line)"
          disabled={isLoading || disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-2.5 py-1.5 text-sm text-primary placeholder-text-muted focus:outline-none tracking-body disabled:opacity-50"
        />

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={onOpenUpload}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-text-muted hover:text-primary hover:bg-neutral-100 transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary"
              title="Upload documents to knowledge base"
              aria-label="Upload document to knowledge base"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-text-muted hidden sm:inline">
              Supports .pdf, .txt, .md
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {input.trim().length > 0 && input.trim().length < 3 && (
              <span className="text-xs text-text-muted font-medium">
                Min 3 chars
              </span>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-all duration-fast ease-coda focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                canSubmit
                  ? 'bg-primary text-on-primary hover:bg-surface active:scale-95 shadow-sm'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
              aria-label="Send query"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-text-muted mt-2 tracking-body">
        Route Agent independently verifies information across internal vector store and web sources.
      </p>
    </div>
  );
};
