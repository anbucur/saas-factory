import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: Props) {
  return (
    <div className={`markdown-body text-sm text-zinc-300 leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-zinc-700 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-zinc-100 mt-5 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-zinc-200 mt-4 mb-1.5 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-medium text-zinc-300 mt-3 mb-1">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-zinc-300 mb-3 leading-relaxed last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 pl-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-zinc-300 leading-relaxed">{children}</li>
          ),
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300 font-mono text-xs" {...props}>
                {children}
              </code>
            ) : (
              <code className="font-mono text-xs text-zinc-200" {...props}>
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 overflow-x-auto mb-4">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-600 pl-4 my-3 text-zinc-400 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-800">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-zinc-200 font-medium border border-zinc-700">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-zinc-300 border border-zinc-700">{children}</td>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-zinc-900/50">{children}</tr>
          ),
          hr: () => <hr className="border-zinc-700 my-4" />,
          a: ({ href, children }) => (
            <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-100">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-zinc-300">{children}</em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
