import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { ProjectPhase } from '../../types';
import { PHASE_META, PHASE_ORDER } from '../../types';
import { staggerContainer, staggerItem } from '../../lib/animations';

interface PhasePipelineProps {
  currentPhase: ProjectPhase;
  phaseProgress?: Record<string, number>;
  onPhaseClick?: (phase: ProjectPhase) => void;
}

export function PhasePipeline({ currentPhase, phaseProgress = {}, onPhaseClick }: PhasePipelineProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Development Pipeline</h3>
        <span className="text-xs text-zinc-500">
          Phase {Math.min(currentIndex + 1, PHASE_ORDER.length)} of {PHASE_ORDER.length - 1}
        </span>
      </div>

      <motion.div
        className="relative flex items-stretch gap-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {PHASE_ORDER.slice(0, -1).map((phase, index) => {
          const meta = PHASE_META[phase];
          const isActive = phase === currentPhase;
          const isCompleted = index < currentIndex;
          const progress = phaseProgress[phase] || (isCompleted ? 100 : isActive ? 50 : 0);

          return (
            <motion.div
              key={phase}
              variants={staggerItem}
              className="flex-1 cursor-pointer"
              onClick={() => onPhaseClick?.(phase)}
            >
              <div
                className={`
                  relative h-24 rounded-xl border transition-all duration-300
                  ${isActive ? 'border-2 bg-zinc-800/80' : 'border bg-zinc-800/40'}
                `}
                style={{
                  borderColor: isActive || isCompleted ? meta.color : undefined,
                  boxShadow: isActive ? `0 0 20px ${meta.color}30` : undefined,
                }}
              >
                <div
                  className="absolute inset-0 rounded-xl overflow-hidden"
                  style={{ backgroundColor: `${meta.color}10` }}
                >
                  <motion.div
                    className="absolute bottom-0 left-0 right-0"
                    style={{ backgroundColor: meta.color }}
                    initial={{ height: 0 }}
                    animate={{ height: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                <div className="relative h-full flex flex-col items-center justify-center p-2">
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.div
                        key="completed"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <CheckCircle2 className="w-5 h-5" style={{ color: meta.color }} />
                      </motion.div>
                    ) : isActive ? (
                      <motion.div
                        key="active"
                        initial={{ scale: 0, rotate: 0 }}
                        animate={{ scale: 1, rotate: 360 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-5 h-5" style={{ color: meta.color }} />
                      </motion.div>
                    ) : (
                      <Circle
                        key="pending"
                        className="w-5 h-5 text-zinc-600"
                      />
                    )}
                  </AnimatePresence>

                  <span
                    className={`mt-1 text-[10px] font-medium text-center leading-tight ${
                      isActive ? 'text-white' : isCompleted ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {meta.label}
                  </span>

                  {isActive && (
                    <span
                      className="text-[10px] font-bold mt-0.5"
                      style={{ color: meta.color }}
                    >
                      {progress}%
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {currentPhase === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <div>
            <div className="text-sm font-semibold text-emerald-400">Project Completed</div>
            <div className="text-xs text-emerald-400/70">All phases finished successfully</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
