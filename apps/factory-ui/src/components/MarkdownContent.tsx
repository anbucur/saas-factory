import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, Brain } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: Props) {
  const [showThoughts, setShowThoughts] = useState(true);

  // Parse sections to extract thoughts
  const parts = content.split(/(<think>[\s\S]*?<\/think>|<think>[\s\S]*)/g);

  return (
    <div className={`markdown-body space-y-4 ${className}`}>
      {parts.map((part, i) => {
        if (part.startsWith('<think>')) {
          const thoughtContent = part.replace('<think>', '').replace('</think>', '').trim();
          if (!thoughtContent) return null;

          return (
            <div key={i} className="my-6">
              <button
                onClick={() => setShowThoughts(!showThoughts)}
                className="group flex items-center gap-2.5 px-4 py-2 rounded-t-2xl bg-amber-500/10 border-x-2 border-t-2 border-amber-500/20 text-[11px] font-bold text-amber-500 uppercase tracking-[0.15em] hover:bg-amber-500/15 transition-all outline-none"
              >
                <div className="p-1 bg-amber-500/20 rounded-md group-hover:bg-amber-500/30 transition-colors">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <span>Agent Reasoning</span>
                <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform duration-300 ${showThoughts ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              <AnimatePresence initial={false}>
                {showThoughts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 bg-amber-500/[0.03] backdrop-blur-sm border-2 border-amber-500/20 rounded-b-2xl rounded-tr-2xl border-t-0 text-sm text-amber-100/60 font-medium italic leading-relaxed whitespace-pre-wrap shadow-inner shadow-amber-500/5">
                      {thoughtContent}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        if (!part.trim()) return null;

        return (
          <ReactMarkdown
            key={i}
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
                <li className="text-sm text-zinc-300 leading-relaxed list-item">{children}</li>
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
                <div className="relative group">
                  <pre className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 overflow-x-auto mb-4 font-mono text-xs text-zinc-300">
                    {children}
                  </pre>
                </div>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-zinc-600 pl-4 my-3 text-zinc-400 italic">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-zinc-800/80 text-zinc-400 uppercase text-[10px] tracking-wider">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-3 text-left font-semibold border-b border-zinc-800">{children}</th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-3 text-zinc-300 border-b border-zinc-800/50">{children}</td>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>
              ),
              hr: () => <hr className="border-zinc-800 my-6" />,
              a: ({ href, children }) => (
                <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-4" target="_blank" rel="noopener noreferrer">
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
            {part}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
