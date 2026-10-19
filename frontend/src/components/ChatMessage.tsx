import React, { useState } from 'react';
import {
  User,
  Sparkles,
  Database,
  Globe,
  Brain,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { ChatMessageItem } from '../types/api';
import { SourceCard } from './SourceCard';
import { CitationTag } from './CitationTag';
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatLatency, formatTime, formatToolName } from '../lib/utils';

interface ChatMessageProps {
  message: ChatMessageItem;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [sourcesExpanded, setSourcesExpanded] = useState<boolean>(true);
  const [highlightedSourceIndex, setHighlightedSourceIndex] = useState<number | null>(null);

  const isUser = message.role === 'user';
  const hasSources = Boolean(message.sources && message.sources.length > 0);

  const renderToolBadge = (tool?: string) => {
    if (!tool) return null;

    if (tool === 'web_search') {
      return (
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm transition-all hover:bg-blue-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>Search Online</span>
        </div>
      );
    }

    if (tool === 'internal_search') {
      return (
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm transition-all hover:bg-emerald-100">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Internal Documents</span>
        </div>
      );
    }

    if (tool === 'direct_reasoning') {
      return (
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm transition-all hover:bg-purple-100">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
          </span>
          <Brain className="w-3.5 h-3.5 text-purple-600" />
          <span>Direct Reasoning</span>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-coda-border text-primary bg-neutral-50">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>{formatToolName(tool)}</span>
      </div>
    );
  };

  const handleCitationClick = (idx: number) => {
    setSourcesExpanded(true);
    setHighlightedSourceIndex(idx);
    const element = document.getElementById(`source-${idx}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setTimeout(() => {
      setHighlightedSourceIndex(null);
    }, 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-4 animate-fadeIn">
        <div className="flex items-start max-w-2xl space-x-3 flex-row-reverse space-x-reverse">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div className="bg-primary text-on-primary px-4 py-3 rounded-lg rounded-tr-none shadow-sm">
            <p className="text-sm font-semibold tracking-body whitespace-pre-wrap">{message.content}</p>
            <div className="mt-1 text-[11px] text-neutral-300 text-right">
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="my-4 animate-fadeIn">
      <div className="p-6 rounded-lg bg-background shadow-card transition-all duration-base ease-coda">
        {/* Header / Route & Latency Badges */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-neutral-100 gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-bold text-primary tracking-body">
              Route Agent
            </span>
            {message.tool_used && renderToolBadge(message.tool_used)}
          </div>

          <div className="flex items-center space-x-3 text-xs text-text-muted">
            {message.latency_ms !== undefined && (
              <div className="inline-flex items-center space-x-1" title="Execution latency">
                <Clock className="w-3.5 h-3.5 text-text-muted" />
                <span className="font-mono">{formatLatency(message.latency_ms)}</span>
              </div>
            )}
            <span>{formatTime(message.timestamp)}</span>
          </div>
        </div>

        {/* Visual Route Indicator Banner */}
        {message.tool_used === 'web_search' && (
          <div className="mt-3 px-3.5 py-2 rounded-md bg-blue-50/80 border border-blue-200/70 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                Researched live via <strong className="font-bold text-blue-950">Search Online</strong>
                {message.sources && message.sources.length > 0
                  ? ` (${message.sources.length} web sources consulted)`
                  : ''}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider bg-blue-100 px-2 py-0.5 rounded">
              Web Research
            </span>
          </div>
        )}

        {message.tool_used === 'internal_search' && (
          <div className="mt-3 px-3.5 py-2 rounded-md bg-emerald-50/80 border border-emerald-200/70 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Retrieved from <strong className="font-bold text-emerald-950">Internal Documents</strong>
                {message.sources && message.sources.length > 0
                  ? ` (${message.sources.length} document citations)`
                  : ''}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">
              Internal RAG
            </span>
          </div>
        )}

        {message.tool_used === 'direct_reasoning' && (
          <div className="mt-3 px-3.5 py-2 rounded-md bg-purple-50/80 border border-purple-200/70 flex items-center justify-between text-xs text-purple-900">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span>
                Formulated directly via <strong className="font-bold text-purple-950">Direct Reasoning</strong>
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-purple-700 uppercase tracking-wider bg-purple-100 px-2 py-0.5 rounded">
              Reasoning
            </span>
          </div>
        )}

        {/* Error notification banner */}
        {message.error && (
          <div className="mt-3 p-3 rounded bg-neutral-100 border-l-4 border-primary flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-primary font-medium">
              {message.error}
            </div>
          </div>
        )}

        {/* Answer Content with Full Markdown Support */}
        <div className="mt-3">
          <MarkdownRenderer content={message.content} />
        </div>

        {/* Inline Citation Pills */}
        {hasSources && message.sources && (
          <div className="mt-4 pt-3 border-t border-neutral-100">
            <div className="flex items-center space-x-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Sources Consulted ({message.sources.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((src, idx) => (
                <CitationTag
                  key={idx}
                  index={idx}
                  type={src.source_type}
                  title={src.title}
                  pageNumber={src.page_number}
                  onClick={() => handleCitationClick(idx)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expanded Sources Grid */}
        {hasSources && message.sources && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              className="flex items-center space-x-1 text-xs font-semibold text-primary hover:text-text-muted transition-colors duration-fast"
            >
              <span>{sourcesExpanded ? 'Hide Source Details' : 'View Source Details'}</span>
              {sourcesExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {sourcesExpanded && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {message.sources.map((src, idx) => (
                  <SourceCard
                    key={idx}
                    index={idx}
                    source={src}
                    highlighted={highlightedSourceIndex === idx}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
