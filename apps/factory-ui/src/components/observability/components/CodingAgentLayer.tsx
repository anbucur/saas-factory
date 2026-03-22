import { memo } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Clock, FileCode } from 'lucide-react';
import type { CLIProvider } from '../../../types';
import { ComponentBox } from './ComponentBox';

interface CodingAgentLayerProps {
  active: boolean;
  provider: CLIProvider;
  task: string | null;
  filesCreated: number;
  duration: number;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export const CodingAgentLayer = memo(function CodingAgentLayer({
  active,
  provider,
  task,
  filesCreated,
  duration,
}: CodingAgentLayerProps) {
  const providerColor = provider === 'opencode' ? 'green' : 'blue';
  const providerName = provider === 'opencode' ? 'OpenCode' : 'Claude Code';

  return (
    <ComponentBox
      title="Coding Agent"
      icon={<Terminal className="w-4 h-4" />}
      color={providerColor}
      active={active}
      glow={active}
      className="max-w-sm"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${provider === 'opencode' ? 'text-emerald-400' : 'text-blue-400'}`}>
            {providerName}
          </span>
          {active && (
            <motion.div
              className="flex items-center gap-1"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400">running</span>
            </motion.div>
          )}
        </div>

        {task && (
          <div className="bg-zinc-800/50 rounded-lg p-2">
            <div className="flex items-start gap-2">
              <FileCode className="w-3.5 h-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-zinc-300 line-clamp-2">{task}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <FileCode className="w-3 h-3 text-zinc-500" />
            <span className="text-zinc-400">{filesCreated} files</span>
          </div>
          {duration > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-400">{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        {active && (
          <motion.div
            className="h-1 bg-zinc-800 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full"
              style={{ 
                width: '50%',
                backgroundColor: provider === 'opencode' ? '#10b981' : '#3b82f6' 
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </div>
    </ComponentBox>
  );
});
