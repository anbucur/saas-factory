import { memo } from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap } from 'lucide-react';
import { ComponentBox } from './ComponentBox';

interface LLMLayerProps {
  thinking: boolean;
  tokensUsed?: number;
  lastCall?: number;
}

export const LLMLayer = memo(function LLMLayer({ thinking, tokensUsed = 0, lastCall }: LLMLayerProps) {
  const isActive = thinking || !!(lastCall && Date.now() - lastCall < 5000);

  return (
    <ComponentBox
      title="MiniMax LLM"
      icon={<Brain className="w-4 h-4" />}
      color="amber"
      active={isActive}
      glow={thinking}
      className="max-w-xs"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">MiniMax-M2.7</span>
          {thinking && (
            <motion.div
              className="flex items-center gap-1.5"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-amber-400">thinking...</span>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-zinc-500">Tokens: </span>
            <span className="text-zinc-300">{tokensUsed.toLocaleString()}</span>
          </div>
        </div>

        {thinking && (
          <motion.div
            className="h-1 bg-zinc-800 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{ width: '50%' }}
            />
          </motion.div>
        )}
      </div>
    </ComponentBox>
  );
});
