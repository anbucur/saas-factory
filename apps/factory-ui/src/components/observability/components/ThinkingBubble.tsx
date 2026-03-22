import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThinkingBubbleProps {
  task: string | null;
  visible?: boolean;
}

export const ThinkingBubble = memo(function ThinkingBubble({ task, visible = true }: ThinkingBubbleProps) {
  if (!task || !visible) return null;

  const truncatedTask = task.length > 60 ? task.slice(0, 60) + '...' : task;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="absolute -top-16 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="relative">
          <div className="thinking-bubble px-3 py-2 rounded-lg bg-zinc-800/95 border border-indigo-500/30 shadow-lg">
            <div className="flex items-start gap-2">
              <span className="text-indigo-400 animate-thinking">💭</span>
              <p className="text-[11px] text-zinc-300 leading-relaxed max-w-[180px]">
                {truncatedTask}
              </p>
            </div>
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-800/95 border-r border-b border-indigo-500/30 rotate-45" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
