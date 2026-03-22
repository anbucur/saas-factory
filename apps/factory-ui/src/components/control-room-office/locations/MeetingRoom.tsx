import { MEETING_ROOMS } from '../data/layoutPositions';

interface MeetingRoomProps {
  roomIndex: number;
}

export function MeetingRoom({ roomIndex }: MeetingRoomProps) {
  const room = MEETING_ROOMS[roomIndex];
  if (!room) return null;

  return (
    <div
      className="absolute bg-zinc-900/80 border border-zinc-700 rounded-xl overflow-hidden"
      style={{
        left: room.position.x,
        top: room.position.y,
        width: room.size.width,
        height: room.size.height,
      }}
    >
      <div className="h-8 bg-zinc-800/80 flex items-center justify-center border-b border-zinc-700">
        <span className="text-xs text-zinc-300 font-medium">{room.name}</span>
      </div>

      <div className="flex-1 p-3 flex flex-wrap gap-2 content-start">
        <div className="w-16 h-12 bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#52525b" strokeWidth="1.5" />
            <line x1="3" y1="9" x2="21" y2="9" stroke="#52525b" strokeWidth="1.5" />
            <circle cx="7" cy="6" r="1" fill="#52525b" />
            <circle cx="12" cy="6" r="1" fill="#52525b" />
          </svg>
        </div>
        <div className="w-16 h-12 bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="3" width="16" height="18" rx="2" stroke="#52525b" strokeWidth="1.5" />
            <line x1="8" y1="8" x2="16" y2="8" stroke="#52525b" strokeWidth="1.5" />
            <line x1="8" y1="12" x2="14" y2="12" stroke="#52525b" strokeWidth="1.5" />
            <line x1="8" y1="16" x2="12" y2="16" stroke="#52525b" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      <div
        className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-6 bg-zinc-700/60 rounded border border-zinc-600/50 flex items-center justify-center"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="#a1a1aa" strokeWidth="1.5" />
          <polyline points="10,17 15,12 10,7" stroke="#a1a1aa" strokeWidth="1.5" />
          <line x1="15" y1="12" x2="3" y2="12" stroke="#a1a1aa" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

export default MeetingRoom;
