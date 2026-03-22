import { memo } from 'react';
import { Server } from 'lucide-react';
import { ComponentBox } from './ComponentBox';

export const APILayer = memo(function APILayer() {
  return (
    <ComponentBox
      title="HTTP API (Hono.js)"
      icon={<Server className="w-4 h-4" />}
      color="purple"
      active
      className="max-w-md mx-auto"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-400">Port 3010</span>
          <span className="text-xs text-zinc-500">REST + WebSocket</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-emerald-400">running</span>
        </div>
      </div>
    </ComponentBox>
  );
});
