import { memo } from 'react';
import { motion } from 'framer-motion';
import { FolderTree, Database, FileText, Table } from 'lucide-react';
import { ComponentBox } from './ComponentBox';

interface DataLayerProps {
  fileCount: number;
  totalSize: number;
  dbWrites: number;
  lastFileWrite?: number;
  lastDbWrite?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DataLayer = memo(function DataLayer({
  fileCount,
  totalSize,
  dbWrites,
  lastFileWrite,
  lastDbWrite,
}: DataLayerProps) {
  const fileActive = lastFileWrite ? Date.now() - lastFileWrite < 3000 : false;
  const dbActive = lastDbWrite ? Date.now() - lastDbWrite < 3000 : false;

  return (
    <div className="flex gap-4 justify-center">
      <ComponentBox
        title="File System"
        icon={<FolderTree className="w-4 h-4" />}
        color="cyan"
        active={!!fileActive}
        pulse={!!fileActive}
        className="flex-1 max-w-xs"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">generated/</span>
            </div>
            <span className="text-zinc-300">{fileCount} files</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Total size</span>
            <span className="text-zinc-300">{formatSize(totalSize)}</span>
          </div>
          {fileActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] text-cyan-400 flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Writing...
            </motion.div>
          )}
        </div>
      </ComponentBox>

      <ComponentBox
        title="SQLite Database"
        icon={<Database className="w-4 h-4" />}
        color="green"
        active={!!dbActive}
        pulse={!!dbActive}
        className="flex-1 max-w-xs"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Table className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-400">projects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Table className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-400">agents</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Table className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-400">tasks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Table className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-400">artifacts</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Writes</span>
            <span className="text-zinc-300">{dbWrites}</span>
          </div>
          {dbActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] text-emerald-400 flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Writing...
            </motion.div>
          )}
        </div>
      </ComponentBox>
    </div>
  );
});
