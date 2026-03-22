import type { AgentRole } from '../../../types';
import { getDeskPosition } from '../data/layoutPositions';

interface DeskProps {
  agentId: string;
  role: AgentRole;
  agentIndex: number;
  label?: string;
  isPM?: boolean;
}

export function Desk({ agentId, role, agentIndex, label, isPM = false }: DeskProps) {
  const position = getDeskPosition(agentId, role, agentIndex);

  return (
    <div
      className="absolute"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div
        className={`bg-zinc-800 rounded-lg border ${
          isPM ? 'border-amber-500/50 bg-zinc-800/90' : 'border-zinc-700/50'
        }`}
        style={{
          width: isPM ? 80 : 64,
          height: isPM ? 56 : 48,
        }}
      >
        <div className="h-3 bg-zinc-700/80 rounded-t-lg flex items-center px-1">
          <div className="w-2 h-2 bg-zinc-500 rounded-full" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          {isPM ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="3" y1="9" x2="21" y2="9" stroke="#f59e0b" strokeWidth="1.5" />
              <rect x="6" y="12" width="12" height="6" rx="1" fill="#f59e0b" opacity="0.3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="6" width="20" height="12" rx="2" stroke="#52525b" strokeWidth="1.5" />
              <rect x="5" y="9" width="14" height="6" rx="1" fill="#3f3f46" />
            </svg>
          )}
        </div>
      </div>

      <div
        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1"
      >
        <span className={`text-[10px] font-medium ${isPM ? 'text-amber-400' : 'text-zinc-400'}`}>
          {label || role.replace('_', ' ').toUpperCase()}
        </span>
      </div>
    </div>
  );
}

export default Desk;
