import React, { useState } from 'react';
import { FileText, Globe, ExternalLink, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { SourceItem } from '../types/api';

interface SourceCardProps {
  source: SourceItem;
  index: number;
  highlighted?: boolean;
}

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  index,
  highlighted = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const isInternal = source.source_type === 'internal';
  const snippet = source.snippet?.trim() ?? '';
  // Check if snippet is long enough to warrant collapsible dropdown
  const isLongSnippet = snippet.length > 100 || snippet.includes('\n');

  const handleCopySnippet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`source-${index}`}
      className={`p-4 rounded-md transition-all duration-base ease-coda text-left flex flex-col justify-between ${
        highlighted
          ? 'bg-neutral-50 ring-2 ring-primary shadow-elevated'
          : 'bg-white shadow-card hover:shadow-elevated'
      }`}
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0 flex-wrap gap-y-1">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold">
              {index + 1}
            </span>
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-medium border border-coda-border text-primary bg-neutral-50">
              {isInternal ? (
                <>
                  <FileText className="w-3 h-3 flex-shrink-0" />
                  <span>Internal Document</span>
                </>
              ) : (
                <>
                  <Globe className="w-3 h-3 flex-shrink-0" />
                  <span>Web Source</span>
                </>
              )}
            </span>
            {source.page_number && (
              <span className="text-xs text-text-muted font-medium">
                Page {source.page_number}
              </span>
            )}
            {source.score !== null && source.score !== undefined && (
              <span className="text-[11px] text-text-muted font-mono">
                Score: {source.score.toFixed(2)}
              </span>
            )}
          </div>

          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-primary transition-colors duration-fast p-1 rounded hover:bg-neutral-100 flex items-center gap-1 text-xs flex-shrink-0"
              aria-label={`Open source ${source.title} in new tab`}
            >
              <span className="hidden sm:inline text-[11px]">Visit</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Title & Filename */}
        <div className="mt-2.5">
          <h4
            className="text-sm font-bold text-primary tracking-body line-clamp-1"
            title={source.title}
          >
            {source.title}
          </h4>
          {source.filename && source.filename !== source.title && (
            <p className="text-xs text-text-muted font-mono mt-0.5 truncate" title={source.filename}>
              {source.filename}
            </p>
          )}
        </div>
      </div>

      {/* Snippet / Dropdown Section */}
      {snippet && (
        <div className="mt-3 pt-2 border-t border-neutral-100">
          {!isLongSnippet ? (
            /* Short snippet: displayed directly without dropdown */
            <div className="p-2.5 rounded bg-neutral-50 border-l-2 border-primary text-xs text-neutral-800 font-normal leading-relaxed select-text whitespace-pre-wrap">
              &ldquo;{snippet}&rdquo;
            </div>
          ) : !isExpanded ? (
            /* Long snippet - Collapsed state */
            <div className="space-y-1.5">
              <div
                onClick={() => setIsExpanded(true)}
                className="p-2.5 rounded bg-neutral-50 border-l-2 border-primary text-xs text-neutral-700 font-normal leading-relaxed line-clamp-3 select-text cursor-pointer hover:bg-neutral-100/80 transition-colors"
                title="Click to expand full excerpt"
              >
                &ldquo;{snippet}&rdquo;
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-semibold text-primary bg-neutral-100 hover:bg-neutral-200/80 transition-all duration-fast"
                aria-expanded={false}
              >
                <span className="flex items-center gap-1.5">
                  <span>View full excerpt</span>
                  <span className="text-[10px] text-text-muted font-mono font-normal">
                    (scrollable)
                  </span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              </button>
            </div>
          ) : (
            /* Long snippet - Expanded dropdown with scrollable text container */
            <div className="rounded-md border border-neutral-200 bg-neutral-50/60 overflow-hidden shadow-sm transition-all duration-base">
              {/* Dropdown Header with Copy and Collapse */}
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-100 border-b border-neutral-200 text-xs font-semibold text-text-muted">
                <span className="text-[11px] uppercase tracking-wider font-mono">
                  Full Excerpt
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="inline-flex items-center space-x-1 text-[11px] text-text-muted hover:text-primary transition-colors p-1 rounded hover:bg-neutral-200"
                    title="Copy full excerpt"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-green-600" />
                        <span className="text-green-600 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="inline-flex items-center space-x-1 text-[11px] text-primary hover:text-text-muted font-bold transition-colors p-1 rounded hover:bg-neutral-200"
                    aria-expanded={true}
                  >
                    <span>Collapse</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable snippet body */}
              <div className="p-3 max-h-48 overflow-y-auto custom-scrollbar text-xs text-neutral-800 font-normal leading-relaxed whitespace-pre-wrap select-text border-l-2 border-primary bg-white/70">
                &ldquo;{snippet}&rdquo;
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
