import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose max-w-none text-coda-text text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-primary font-display tracking-tight mt-5 mb-2 pb-1.5 border-b border-neutral-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-primary font-display tracking-tight mt-4 mb-2 pb-1 border-b border-neutral-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-primary font-display tracking-heading mt-3.5 mb-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-bold text-primary font-body tracking-body mt-3 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-2.5 text-sm leading-relaxed text-coda-text tracking-body">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-2.5 list-disc list-inside space-y-1.5 pl-1 text-sm text-coda-text">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 list-decimal list-inside space-y-1.5 pl-1 text-sm text-coda-text">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="tracking-body leading-relaxed text-sm text-coda-text">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-primary bg-neutral-50 px-4 py-2 text-sm text-text-muted italic rounded-r-md">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-neutral-200" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold underline underline-offset-2 hover:text-text-muted transition-colors duration-fast"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-primary">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          table: ({ children }) => (
            <div className="my-4 w-full overflow-x-auto rounded-md border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-100 text-primary font-bold">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-neutral-100 bg-white">{children}</tbody>
          ),
          tr: ({ children }) => <tr className="hover:bg-neutral-50/50">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3.5 py-2 font-bold text-primary">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-coda-text">{children}</td>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');

            if (isInline) {
              return (
                <code
                  className="rounded bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 font-mono text-xs text-primary font-medium"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const codeText = String(children).replace(/\n$/, '');
            return (
              <CodeBlock language={match ? match[1] : ''} code={codeText} />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <div className="my-3 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden text-neutral-100 text-xs font-mono shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-neutral-950 border-b border-neutral-800">
        <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center space-x-1 text-neutral-400 hover:text-white px-2 py-0.5 rounded text-[11px] transition-colors"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="whitespace-pre">{code}</pre>
      </div>
    </div>
  );
};
