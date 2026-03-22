import { memo } from 'react';
import { motion } from 'framer-motion';
import { Workflow, Clock } from 'lucide-react';
import { PHASE_META, type ProjectPhase } from '../../../types';
import { ComponentBox } from './ComponentBox';

interface TemporalLayerProps {
  phase: ProjectPhase;
  projectName: string;
  status: string;
  duration?: number;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export const TemporalLayer = memo(function TemporalLayer({ 
  phase, 
  projectName, 
  status,
  duration = 0 
}: TemporalLayerProps) {
  const phaseMeta = PHASE_META[phase];
  const isActive = status === 'in_progress';

  return (
    <ComponentBox
      title="Temporal Orchestrator"
      icon={<Workflow className="w-4 h-4" />}
      color="cyan"
      active={isActive}
      glow={isActive}
      className="max-w-lg mx-auto"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-300">{projectName}</span>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span className="text-zinc-400">{formatDuration(duration)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Phase:</span>
          <motion.span
            key={phase}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs font-medium"
            style={{ color: phaseMeta.color }}
          >
            {phaseMeta.label}
          </motion.span>
          {isActive && (
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: phaseMeta.color }}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        <div className="flex items-center gap-1 pt-1">
          {(['requirements', 'architecture', 'development', 'testing', 'deployment'] as ProjectPhase[]).map((p, i) => {
            const meta = PHASE_META[p];
            const isPast = ['requirements', 'architecture', 'development', 'testing', 'deployment'].indexOf(p) < ['requirements', 'architecture', 'development', 'testing', 'deployment'].indexOf(phase);
            const isCurrent = p === phase;
            
            return (
              <div key={p} className="flex items-center">
                <motion.div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2"
                  style={{
                    backgroundColor: isPast || isCurrent ? meta.color : 'transparent',
                    borderColor: meta.color,
                    color: isPast || isCurrent ? '#000' : meta.color,
                  }}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {i + 1}
                </motion.div>
                {i < 4 && (
                  <div 
                    className="w-4 h-0.5 mx-0.5"
                    style={{ backgroundColor: isPast ? meta.color : '#3f3f46' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ComponentBox>
  );
});
