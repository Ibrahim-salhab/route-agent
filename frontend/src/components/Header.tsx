import React, { useEffect, useState } from 'react';
import { Layers, Activity, RotateCcw, Database } from 'lucide-react';
import { HealthResponse } from '../types/api';
import { getHealth } from '../lib/api';

interface HeaderProps {
  onOpenDocuments: () => void;
  documentCount: number;
  onClearChat?: () => void;
  hasMessages?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDocuments,
  documentCount,
  onClearChat,
  hasMessages = false,
}) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const data = await getHealth();
        if (isMounted) setHealth(data);
      } catch {
        if (isMounted) {
          setHealth({
            status: 'degraded',
            api: 'disconnected',
            vector_store: 'unknown',
            embedding_service: 'unknown',
            llm_provider: 'local',
            llm_model: 'unknown',
          });
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isHealthy = health?.status === 'healthy';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold font-mono text-sm shadow-sm">
            RA
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary font-display tracking-tight leading-none">
              Route Agent
            </h1>
            <p className="text-[11px] text-text-muted tracking-body mt-0.5 hidden sm:block">
              Hybrid RAG & Autonomous Research
            </p>
          </div>
        </div>

        {/* System Health & Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Health Badge */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-xs text-primary font-medium"
            title={`API: ${health?.api || 'connecting'} | ChromaDB: ${health?.vector_store || 'connecting'} | Model: ${health?.llm_model || 'configured'}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-black animate-pulse' : 'bg-neutral-400'
              }`}
            />
            <Activity className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden md:inline font-mono text-[11px]">
              {health?.llm_provider ? `${health.llm_provider}` : 'System'}
            </span>
            <span className="text-[11px] text-text-muted">
              {isHealthy ? 'Online' : 'Degraded'}
            </span>
          </div>

          {/* Reset / Clear Chat Button */}
          {hasMessages && (
            <button
              type="button"
              onClick={onClearChat}
              className="min-h-[44px] px-3 flex items-center space-x-1.5 rounded-md text-xs font-semibold text-text-muted hover:text-primary hover:bg-neutral-100 transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Clear chat conversation"
              title="Start a new research thread"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Thread</span>
            </button>
          )}

          {/* Knowledge Base Toggle Button */}
          <button
            type="button"
            onClick={onOpenDocuments}
            className="min-h-[44px] px-3.5 flex items-center space-x-2 rounded-md bg-white border border-coda-border hover:border-primary text-primary shadow-sm hover:shadow-card transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            aria-label={`Open knowledge base drawer. ${documentCount} documents indexed.`}
          >
            <Database className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold tracking-body">Docs</span>
            {documentCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold">
                {documentCount}
              </span>
            )}
            <Layers className="w-3.5 h-3.5 text-text-muted ml-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
