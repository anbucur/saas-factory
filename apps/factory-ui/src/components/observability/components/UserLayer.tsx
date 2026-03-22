import { memo } from 'react';
import { motion } from 'framer-motion';
import { Globe, Wifi, WifiOff } from 'lucide-react';
import { ComponentBox } from './ComponentBox';

interface UserLayerProps {
  wsConnected: boolean;
}

export const UserLayer = memo(function UserLayer({ wsConnected }: UserLayerProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <ComponentBox
        title="Browser"
        icon={<Globe className="w-4 h-4" />}
        color="blue"
        active
        className="flex-1 max-w-xs"
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 h-5 bg-zinc-800 rounded text-[10px] text-zinc-500 px-2 flex items-center">
            localhost:3000
          </div>
        </div>
      </ComponentBox>

      <motion.div
        animate={{
          scale: wsConnected ? [1, 1.1, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <ComponentBox
          title="WebSocket"
          icon={wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          color={wsConnected ? 'green' : 'zinc'}
          active={wsConnected}
          className="w-40"
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs ${wsConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {wsConnected ? 'Connected' : 'Disconnected'}
            </span>
            {wsConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
        </ComponentBox>
      </motion.div>
    </div>
  );
});
