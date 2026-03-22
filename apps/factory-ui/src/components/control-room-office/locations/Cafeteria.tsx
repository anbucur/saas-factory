import { CAFETERIA_ZONES } from '../data/layoutPositions';

export function Cafeteria() {
  return (
    <div className="absolute bg-zinc-900/60 border-t border-zinc-800" style={{
      left: 0,
      top: 650,
      width: 1200,
      height: 150,
    }}>
      <div className="h-6 bg-zinc-800/80 flex items-center justify-center border-b border-zinc-700">
        <span className="text-xs text-zinc-400 font-medium">CAFETERIA</span>
      </div>

      <div className="flex items-center justify-around px-8 py-3">
        {CAFETERIA_ZONES.map((zone) => (
          <div key={zone.id} className="flex flex-col items-center">
            <div
              className="w-20 h-14 bg-zinc-800/40 rounded-lg border border-zinc-700/30 flex items-center justify-center"
            >
              {zone.id === 'cafe-coffee' && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M17 8h1a4 4 0 0 1 0 8h-1" stroke="#a1a1aa" strokeWidth="1.5" />
                  <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" stroke="#a1a1aa" strokeWidth="1.5" />
                  <path d="M6 1v3M10 1v3M14 1v3" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              {zone.id === 'cafe-food' && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#a1a1aa" strokeWidth="1.5" />
                  <path d="M12 7v5l3 3" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="2" fill="#a1a1aa" />
                </svg>
              )}
              {zone.id === 'cafe-lounge' && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="10" width="20" height="8" rx="3" stroke="#a1a1aa" strokeWidth="1.5" />
                  <path d="M5 10V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" stroke="#a1a1aa" strokeWidth="1.5" />
                  <path d="M2 14h20" stroke="#a1a1aa" strokeWidth="1.5" />
                </svg>
              )}
              {zone.id === 'cafe-chat' && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="#a1a1aa" strokeWidth="1.5" />
                  <path d="M8 10h8M8 13h5" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              {zone.id === 'cafe-plants' && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22V12" stroke="#6b7280" strokeWidth="1.5" />
                  <path d="M12 12c0-4 4-8 8-8-4 0-8 4-8 8z" stroke="#22c55e" strokeWidth="1.5" />
                  <path d="M12 12c0-4-4-8-8-8 4 0 8 4 8 8z" stroke="#22c55e" strokeWidth="1.5" />
                  <path d="M12 8c0-2 2-4 4-4-2 0-4 2-4 4z" stroke="#22c55e" strokeWidth="1.5" />
                  <rect x="9" y="20" width="6" height="3" rx="1" fill="#92400e" />
                </svg>
              )}
            </div>
            <span className="text-[9px] text-zinc-500 mt-1">{zone.name}</span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 bg-zinc-700 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default Cafeteria;
