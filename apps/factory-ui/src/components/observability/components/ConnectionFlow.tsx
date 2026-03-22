import { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface ConnectionFlowProps {
  active?: boolean;
  color?: 'blue' | 'purple' | 'green' | 'amber' | 'cyan';
}

const colorMap = {
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  cyan: 'text-cyan-400',
};

export const ConnectionFlow = memo(function ConnectionFlow({ active = false, color = 'blue' }: ConnectionFlowProps) {
  return (
    <div className="flex items-center justify-center py-1">
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {active && (
          <>
            <motion.div
              className={`w-1 h-8 rounded-full bg-current ${colorMap[color]}`}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className={`w-2 h-2 rounded-full bg-current ${colorMap[color]}`}
              animate={{ y: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className={`w-2 h-2 rounded-full bg-current ${colorMap[color]}`}
              animate={{ y: [0, 3, 0], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            />
          </>
        )}
        <div className={`h-0.5 w-8 border-t border-dashed ${active ? colorMap[color] : 'border-zinc-600'}`} />
        <ArrowDown className={`w-3 h-3 ${active ? colorMap[color] : 'text-zinc-600'}`} />
      </motion.div>
    </div>
  );
});
