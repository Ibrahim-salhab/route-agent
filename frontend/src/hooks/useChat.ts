import { useState, useCallback, useRef } from 'react';
import { ChatMessageItem, ToolRoute } from '../types/api';
import { queryAgent, ApiError } from '../lib/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<ToolRoute | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setError('Query must be at least 3 characters long.');
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError(null);
    setIsLoading(true);

    // Anticipate route immediately to power dynamic loading status
    const isDocQuery = /(uploaded|document|documents|file|files|pdf|txt|markdown|notes|ملف|الملف|مستند|المستند|مرفوع|المرفوع|تقرير|وثيقة)/i.test(trimmed);
    const isWebQuery = /(current|latest|today|now|live|news|weather|price|stock|update|اليوم|الآن|أحدث|أخبار|سعر|أسعار|الطقس)/i.test(trimmed);

    if (isDocQuery) {
      setCurrentRoute('internal_search');
    } else if (isWebQuery) {
      setCurrentRoute('web_search');
    } else {
      setCurrentRoute(null);
    }

    const userMessage: ChatMessageItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await queryAgent(trimmed, controller.signal);

      const assistantMessage: ChatMessageItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        latency_ms: response.latency_ms,
        tool_used: response.tool_used,
        timestamp: new Date(),
      };

      setCurrentRoute(response.tool_used);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 408) {
        // aborted / timed out
        return;
      }
      const errorDetail =
        err instanceof ApiError
          ? err.detail || err.message
          : err instanceof Error
          ? err.message
          : 'An unexpected error occurred.';

      setError(errorDetail);

      const errorMessage: ChatMessageItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 2),
        role: 'assistant',
        content: `Error: ${errorDetail}`,
        timestamp: new Date(),
        error: errorDetail,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setError(null);
    setCurrentRoute(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    currentRoute,
    sendMessage,
    clearChat,
  };
}
