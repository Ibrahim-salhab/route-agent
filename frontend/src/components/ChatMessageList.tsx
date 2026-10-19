import React, { useEffect, useRef } from 'react';
import { Database, Globe, Brain, HelpCircle } from 'lucide-react';
import { ChatMessageItem, ToolRoute } from '../types/api';
import { ChatMessage } from './ChatMessage';
import { LoadingState } from './LoadingState';

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  isLoading: boolean;
  currentRoute: ToolRoute | null;
  onSelectPrompt?: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: Database,
    title: 'Private Document RAG',
    prompt: 'What are the main findings in my uploaded document?',
  },
  {
    icon: Globe,
    title: 'Live Web Research',
    prompt: 'What are the latest developments in AI autonomous agents today?',
  },
  {
    icon: Brain,
    title: 'Direct Reasoning',
    prompt: 'Explain the difference between dense retrieval and sparse BM25 retrieval.',
  },
];

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  currentRoute,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-primary tracking-heading font-display">
              Route Agent
            </h2>
            <p className="text-base text-text-muted tracking-body max-w-md mx-auto">
              Autonomous research combining private document retrieval, live web search, and LLM reasoning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left pt-4">
            {SUGGESTED_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectPrompt?.(item.prompt)}
                  className="p-4 rounded-md bg-white shadow-card hover:shadow-elevated transition-all duration-base ease-coda border-none group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-100 group-hover:bg-primary group-hover:text-on-primary transition-colors duration-fast flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-primary group-hover:text-on-primary" />
                  </div>
                  <h3 className="text-xs font-bold text-primary tracking-body uppercase">
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 tracking-body line-clamp-2">
                    {item.prompt}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-center space-x-2 text-xs text-text-muted">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Upload .pdf, .txt, or .md documents anytime via the drawer or paperclip icon.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-4xl mx-auto w-full">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <LoadingState
          toolRoute={currentRoute}
          message="Reasoning & searching knowledge..."
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
};
