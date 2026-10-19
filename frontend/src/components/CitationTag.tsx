import React from 'react';
import { FileText, Globe } from 'lucide-react';
import { SourceType } from '../types/api';

interface CitationTagProps {
  index: number;
  type: SourceType;
  title: string;
  pageNumber?: number | null;
  onClick?: () => void;
}

export const CitationTag: React.FC<CitationTagProps> = ({
  index,
  type,
  title,
  pageNumber,
  onClick,
}) => {
  const isInternal = type === 'internal';

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center space-x-1.5 px-2 py-1 my-0.5 rounded-sm text-xs font-semibold border border-coda-border hover:border-primary hover:text-primary text-text-muted bg-white transition-all duration-fast ease-coda cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
      title={`${isInternal ? 'Internal Document' : 'Web Source'}: ${title}${pageNumber ? ` (Page ${pageNumber})` : ''}`}
      aria-label={`Citation ${index + 1}: ${title}`}
    >
      {isInternal ? (
        <FileText className="w-3 h-3 text-primary flex-shrink-0" />
      ) : (
        <Globe className="w-3 h-3 text-primary flex-shrink-0" />
      )}
      <span className="font-mono text-[11px] font-bold text-primary">[{index + 1}]</span>
      <span className="truncate max-w-[120px]">{title}</span>
      {pageNumber && <span className="text-[10px] text-text-muted">p.{pageNumber}</span>}
    </button>
  );
};
