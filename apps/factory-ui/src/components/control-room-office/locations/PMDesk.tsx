import { PM_DESK_POSITION } from '../data/layoutPositions';

export function PMDesk() {
  return (
    <div
      className="absolute"
      style={{
        left: PM_DESK_POSITION.x,
        top: PM_DESK_POSITION.y,
      }}
    >
      <div
        className="bg-zinc-800/90 rounded-xl border-2 border-amber-500/50 relative"
        style={{
          width: 96,
          height: 72,
        }}
      >
        <div className="h-5 bg-amber-600/20 rounded-t-lg flex items-center justify-center border-b border-amber-500/30">
          <span className="text-[9px] font-bold text-amber-400">PM DESK</span>
        </div>

        <div className="flex-1 flex items-center justify-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#f59e0b" strokeWidth="1.5" />
            <line x1="3" y1="9" x2="21" y2="9" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="6" y="12" width="12" height="6" rx="1" fill="#f59e0b" opacity="0.3" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="8" y="2" width="8" height="4" rx="1" stroke="#f59e0b" strokeWidth="1.5" />
          </svg>
        </div>

        <div
          className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-amber-500/20 rounded-full border-2 border-amber-500/40 flex items-center justify-center"
          title="Artifact Delivery Zone"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
        <span className="text-xs font-bold text-amber-400">PROJECT MANAGER</span>
      </div>
    </div>
  );
}

export default PMDesk;
