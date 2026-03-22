import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Sparkles,
  Clock
} from 'lucide-react';
import type { ActivityLogEntry, AgentRole } from '../../types';
import { AGENT_ROLE_META } from '../../types';
import { activitySlideIn } from '../../lib/animations';

interface LiveActivityFeedProps {
  logs: ActivityLogEntry[];
  maxItems?: number;
}

const LOG_TYPE_CONFIG = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  milestone: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

export function LiveActivityFeed({ logs, maxItems = 50 }: LiveActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayLogs = logs.slice(-maxItems).reverse();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs.length]);

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live Activity
        </h3>
        <span className="text-xs text-zinc-500">{logs.length} events</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence mode="popLayout">
          {displayLogs.map((log, index) => {
            const config = LOG_TYPE_CONFIG[log.logType];
            const Icon = config.icon;
            const agentMeta = log.agentRole ? AGENT_ROLE_META[log.agentRole as AgentRole] : null;

            return (
              <motion.div
                key={log.id}
                layout
                variants={activitySlideIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`
                  relative p-3 rounded-xl ${config.bg} border border-zinc-800/50
                  hover:border-zinc-700 transition-colors
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {agentMeta && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ 
                            backgroundColor: `${agentMeta.color}20`,
                            color: agentMeta.color 
                          }}
                        >
                          {agentMeta.title}
                        </span>
                      )}
                      <span className="text-sm text-white font-medium">{log.action}</span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-zinc-400 mt-1 truncate">{log.details}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      <span className="text-[10px] text-zinc-500">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                      {log.phase && (
                        <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800">
                          {log.phase}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {index === 0 && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 to-transparent"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: '100%' }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Info className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No activity yet</p>
            <p className="text-xs mt-1">Events will appear here in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
}
