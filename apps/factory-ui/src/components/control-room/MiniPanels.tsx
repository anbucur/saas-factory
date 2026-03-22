import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight,
  FileText,
  CheckSquare,
  MessageSquare,
  Folder
} from 'lucide-react';
import type { Task, Artifact, Conversation } from '../../types';

interface MiniPanelProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  accentColor?: string;
}

export function MiniPanel({ title, icon, count, children, defaultExpanded = true, accentColor = '#3b82f6' }: MiniPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div style={{ color: accentColor }}>{icon}</div>
          <span className="text-sm font-semibold text-white">{title}</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
          >
            {count}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 max-h-64 overflow-y-auto">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TasksMiniPanelProps {
  tasks: Task[];
}

export function TasksMiniPanel({ tasks }: TasksMiniPanelProps) {
  const statusGroups = {
    done: tasks.filter(t => t.status === 'done'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    todo: tasks.filter(t => t.status === 'todo' || t.status === 'backlog'),
    review: tasks.filter(t => t.status === 'review'),
  };

  return (
    <MiniPanel
      title="Tasks"
      icon={<CheckSquare className="w-4 h-4" />}
      count={tasks.length}
      accentColor="#10b981"
    >
      <div className="space-y-2">
        {statusGroups.in_progress.slice(0, 3).map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
          >
            <div className="w-4 h-4 rounded border-2 border-emerald-500 flex items-center justify-center">
              <motion.div
                className="w-2 h-2 rounded-sm bg-emerald-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
            <span className="text-xs text-white flex-1 truncate">{task.title}</span>
          </div>
        ))}
        {statusGroups.todo.slice(0, 3).map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50"
          >
            <div className="w-4 h-4 rounded border border-zinc-600" />
            <span className="text-xs text-zinc-400 flex-1 truncate">{task.title}</span>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-4">No tasks yet</p>
        )}
      </div>
    </MiniPanel>
  );
}

interface ArtifactsMiniPanelProps {
  artifacts: Artifact[];
}

export function ArtifactsMiniPanel({ artifacts }: ArtifactsMiniPanelProps) {
  const typeIcons: Record<string, string> = {
    spec: '📄',
    architecture: '🏗️',
    code: '💻',
    test_report: '🧪',
    review: '👁️',
    deployment_config: '🚀',
    documentation: '📚',
  };

  return (
    <MiniPanel
      title="Artifacts"
      icon={<FileText className="w-4 h-4" />}
      count={artifacts.length}
      accentColor="#8b5cf6"
    >
      <div className="space-y-1.5">
        {artifacts.slice(-8).reverse().map((artifact) => (
          <div
            key={artifact.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <span className="text-sm">{typeIcons[artifact.type] || '📄'}</span>
            <span className="text-xs text-white flex-1 truncate">{artifact.title}</span>
            <span className="text-[10px] text-zinc-500">{artifact.type}</span>
          </div>
        ))}
        {artifacts.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-4">No artifacts yet</p>
        )}
      </div>
    </MiniPanel>
  );
}

interface ConversationsMiniPanelProps {
  conversations: Conversation[];
}

export function ConversationsMiniPanel({ conversations }: ConversationsMiniPanelProps) {
  return (
    <MiniPanel
      title="Conversations"
      icon={<MessageSquare className="w-4 h-4" />}
      count={conversations.length}
      accentColor="#06b6d4"
    >
      <div className="space-y-1.5">
        {conversations.slice(-6).reverse().map((convo) => (
          <div
            key={convo.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                convo.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs text-white flex-1 truncate">{convo.title}</span>
            <span className="text-[10px] text-zinc-500">{convo.phase}</span>
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-4">No conversations yet</p>
        )}
      </div>
    </MiniPanel>
  );
}

interface FilesMiniPanelProps {
  files: { filePath: string; fileType: string; sizeBytes: number }[];
}

export function FilesMiniPanel({ files }: FilesMiniPanelProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <MiniPanel
      title="Generated Files"
      icon={<Folder className="w-4 h-4" />}
      count={files.length}
      accentColor="#f59e0b"
    >
      <div className="space-y-1">
        {files.slice(-10).reverse().map((file, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-white flex-1 truncate font-mono">
              {file.filePath.split('/').pop()}
            </span>
            <span className="text-[10px] text-zinc-500">{formatSize(file.sizeBytes)}</span>
          </div>
        ))}
        {files.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-4">No files generated yet</p>
        )}
      </div>
    </MiniPanel>
  );
}
