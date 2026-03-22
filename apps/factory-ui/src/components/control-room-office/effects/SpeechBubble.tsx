import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

type BubbleType = 'thought' | 'exclamation' | 'dots' | 'artifact';

interface SpeechBubbleProps {
  type: BubbleType;
  visible: boolean;
  children?: ReactNode;
  className?: string;
}

const BUBBLE_ICONS: Record<BubbleType, ReactNode> = {
  thought: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 21h6M12 3a6 6 0 0 0-6 6c0 2.22 1.21 4.16 3 5.19V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.81c1.79-1.03 3-2.97 3-5.19a6 6 0 0 0-6-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  exclamation: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  dots: (
    <div className="flex gap-0.5">
      <motion.div
        className="w-1.5 h-1.5 bg-current rounded-full"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
      />
      <motion.div
        className="w-1.5 h-1.5 bg-current rounded-full"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div
        className="w-1.5 h-1.5 bg-current rounded-full"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  ),
  artifact: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const BUBBLE_COLORS: Record<BubbleType, string> = {
  thought: 'bg-amber-400/90 text-amber-900',
  exclamation: 'bg-red-500/90 text-white',
  dots: 'bg-zinc-600/90 text-white',
  artifact: 'bg-emerald-500/90 text-white',
};

export function SpeechBubble({ type, visible, children, className = '' }: SpeechBubbleProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 10 }}
          transition={{ duration: 0.2, type: 'spring', stiffness: 500 }}
          className={`absolute -top-8 right-0 flex items-center gap-1 px-2 py-1 rounded-full shadow-lg ${BUBBLE_COLORS[type]} ${className}`}
        >
          {BUBBLE_ICONS[type]}
          {children && <span className="text-[10px] font-medium">{children}</span>}
          <div
            className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${
              type === 'thought' ? 'border-t-amber-400/90' : type === 'exclamation' ? 'border-t-red-500/90' : 'border-t-zinc-600/90'
            }`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SpeechBubble;
