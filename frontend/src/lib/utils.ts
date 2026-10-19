/**
 * Utility functions for formatting, class merging, and string transforms.
 */

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatLatency(latencyMs?: number): string {
  if (latencyMs === undefined || latencyMs === null) return '';
  if (latencyMs >= 1000) {
    return `${(latencyMs / 1000).toFixed(2)}s`;
  }
  return `${Math.round(latencyMs)}ms`;
}

export function formatToolName(tool?: string): string {
  switch (tool) {
    case 'internal_search':
      return 'Internal Documents';
    case 'web_search':
      return 'Search Online';
    case 'direct_reasoning':
      return 'Direct Reasoning';
    default:
      return tool || 'Autonomous Agent';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
}
