import React, { useEffect, useState } from 'react';
import { Sparkles, Globe, Database, Brain } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  toolRoute?: string | null;
}

const ROUTE_PHASES = [
  'Evaluating query intent with autonomous router...',
  'Selecting optimal path (Internal Documents vs. Search Online)...',
  'Synthesizing answer with verified citations...',
];

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  toolRoute,
}) => {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % ROUTE_PHASES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const renderLoadingRouteBadge = () => {
    if (toolRoute === 'web_search') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm animate-pulse">
          <Globe className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Searching Online...</span>
        </span>
      );
    }
    if (toolRoute === 'internal_search') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-pulse">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Querying Internal Documents...</span>
        </span>
      );
    }
    if (toolRoute === 'direct_reasoning') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm animate-pulse">
          <Brain className="w-3.5 h-3.5 text-purple-600" />
          <span>Direct Reasoning...</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-medium border border-coda-border text-text-muted bg-neutral-50">
        <Sparkles className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: '3s' }} />
        <span>Autonomous Agent</span>
      </span>
    );
  };

  const dynamicMessage =
    toolRoute === 'web_search'
      ? 'Connecting to live web sources and extracting relevant data...'
      : toolRoute === 'internal_search'
      ? 'Scanning indexed vector store and matching document chunks...'
      : message || ROUTE_PHASES[phaseIndex];

  return (
    <div
      className="p-6 rounded-lg bg-background shadow-card transition-all duration-base ease-coda"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary flex-shrink-0">
          <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '2.5s' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-sm font-semibold text-primary tracking-body">
              Route Agent
            </span>
            {renderLoadingRouteBadge()}
          </div>
          <p className="text-sm text-text-muted mt-1 tracking-body animate-pulse">
            {dynamicMessage}
          </p>
        </div>
      </div>

      {/* Elegant minimalist skeleton lines adhering to Coda design */}
      <div className="mt-4 space-y-2.5">
        <div className="h-3 bg-neutral-100 rounded-sm w-5/6 animate-pulse" />
        <div className="h-3 bg-neutral-100 rounded-sm w-4/6 animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="h-3 bg-neutral-100 rounded-sm w-3/6 animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};
