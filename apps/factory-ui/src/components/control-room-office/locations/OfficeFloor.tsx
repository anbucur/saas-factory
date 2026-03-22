import { MeetingRoom } from './MeetingRoom';
import { Desk } from './Desk';
import { PMDesk } from './PMDesk';
import { Cafeteria } from './Cafeteria';
import { FLOOR_SIZE, MEETING_ROOMS } from '../data/layoutPositions';

export function OfficeFloor() {
  return (
    <div
      className="relative bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800"
      style={{
        width: FLOOR_SIZE.width,
        height: FLOOR_SIZE.height,
      }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(63, 63, 70, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(63, 63, 70, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 via-transparent to-zinc-900/40 pointer-events-none" />

      {[0, 1, 2].map((i) => (
        <MeetingRoom key={i} roomIndex={i} />
      ))}

      <div className="absolute" style={{ top: 200, left: 0, right: 0, height: 450 }}>
        <div className="relative w-full h-full">
          <div className="absolute left-4 top-4 text-[10px] text-zinc-600 font-medium">DESK AREA</div>

          <PMDesk />

          {MEETING_ROOMS.map((_, i) => (
            <Desk
              key={`desk-mr-${i}`}
              agentId={`desk-mr-${i}`}
              role="architect"
              agentIndex={i + 10}
              label={`Meeting ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <Cafeteria />

      <div className="absolute top-2 right-2 flex items-center gap-2 bg-zinc-900/80 rounded-lg px-2 py-1">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
        <span className="text-[10px] text-zinc-400 font-medium">LIVE</span>
      </div>
    </div>
  );
}

export default OfficeFloor;
