import { useMemo } from 'react';
import { useAppStore } from '../../../store/store';
import { AGENT_ROLE_META } from '../../../types';
import { FLOOR_SIZE } from '../data/layoutPositions';

interface MiniMapProps {
  className?: string;
}

const MINI_MAP_SCALE = 0.12;

export function MiniMap({ className = '' }: MiniMapProps) {
  const agents = useAppStore((s) => s.currentProject?.agents || []);

  const agentDots = useMemo(() => {
    return agents.map((agent) => {
      const meta = AGENT_ROLE_META[agent.role];
      const color = meta?.color || '#6366f1';

      let x = 0;
      let y = 0;

      switch (agent.status) {
        case 'idle':
          x = 100 + (agent.id.charCodeAt(0) % 5) * 180;
          y = 700;
          break;
        case 'working':
        case 'thinking':
        case 'reviewing':
          x = 300 + (agent.id.charCodeAt(0) % 5) * 120;
          y = 400 + (agent.id.charCodeAt(1) % 3) * 80;
          break;
        case 'done':
          x = 200 + (agent.id.charCodeAt(0) % 3) * 400;
          y = 90;
          break;
        default:
          x = 100 + (agent.id.charCodeAt(0) % 5) * 180;
          y = 700;
      }

      return {
        id: agent.id,
        x: x * MINI_MAP_SCALE,
        y: y * MINI_MAP_SCALE,
        color,
        role: agent.role,
        status: agent.status,
      };
    });
  }, [agents]);

  return (
    <div
      className={`bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-zinc-700 overflow-hidden ${className}`}
      style={{
        width: FLOOR_SIZE.width * MINI_MAP_SCALE + 20,
        height: FLOOR_SIZE.height * MINI_MAP_SCALE + 40,
      }}
    >
      <div className="px-2 py-1 border-b border-zinc-700 flex items-center justify-between">
        <span className="text-[9px] font-medium text-zinc-400">Overview</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
          <span className="text-[8px] text-zinc-500">{agents.length} agents</span>
        </div>
      </div>

      <div className="relative p-1">
        <div
          className="relative bg-zinc-950 rounded"
          style={{
            width: FLOOR_SIZE.width * MINI_MAP_SCALE,
            height: FLOOR_SIZE.height * MINI_MAP_SCALE,
          }}
        >
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" viewBox={`0 0 ${FLOOR_SIZE.width} ${FLOOR_SIZE.height}`}>
              <line x1="0" y1={180 * MINI_MAP_SCALE} x2={FLOOR_SIZE.width} y2={180 * MINI_MAP_SCALE} stroke="#52525b" strokeWidth="1" />
              <line x1="0" y1={650 * MINI_MAP_SCALE} x2={FLOOR_SIZE.width} y2={650 * MINI_MAP_SCALE} stroke="#52525b" strokeWidth="1" />
            </svg>
          </div>

          <div className="absolute top-[2px] left-1/2 transform -translate-x-1/2 text-[6px] text-zinc-600">
            MEETINGS
          </div>
          <div className="absolute bottom-[2px] left-1/2 transform -translate-x-1/2 text-[6px] text-zinc-600">
            CAFETERIA
          </div>

          {agentDots.map((dot) => (
            <div
              key={dot.id}
              className="absolute rounded-full transition-all duration-300"
              style={{
                left: dot.x - 3,
                top: dot.y - 3,
                width: 6,
                height: 6,
                backgroundColor: dot.color,
                boxShadow: `0 0 4px ${dot.color}`,
                opacity: dot.status === 'idle' ? 0.5 : 1,
              }}
              title={`${dot.role}: ${dot.status}`}
            />
          ))}

          <div
            className="absolute bg-amber-500/30 border border-amber-500/50 rounded"
            style={{
              left: 560 * MINI_MAP_SCALE - 5,
              top: 380 * MINI_MAP_SCALE - 5,
              width: 10,
              height: 10,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default MiniMap;
