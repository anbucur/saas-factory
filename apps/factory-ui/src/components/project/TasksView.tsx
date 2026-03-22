import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectDetail, Task, Agent, CLISession, Artifact, TaskStatus } from '../../types';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/store';
import { 
  CheckCircle2, Circle, Clock, Terminal, ChevronRight, ChevronDown,
  FileText, AlertCircle, AlertTriangle, Loader2, Copy, Check
} from 'lucide-react';
import { AGENT_ROLE_META } from '../../types';

interface Props {
  project: ProjectDetail;
}

type TaskViewTab = 'board' | 'terminal';

function TaskCard({ 
  task, 
  agent, 
  isExpanded, 
  onToggle,
  artifact,
  cliSession,
  liveOutput,
  isLive
}: { 
  task: Task; 
  agent?: Agent;
  isExpanded: boolean;
  onToggle: () => void;
  artifact?: Artifact;
  cliSession?: CLISession;
  liveOutput?: string;
  isLive?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const agentMeta = agent?.role ? AGENT_ROLE_META[agent.role] : null;
  
  const priorityColors = {
    low: 'bg-zinc-500/20 text-zinc-400',
    medium: 'bg-blue-500/20 text-blue-400',
    high: 'bg-amber-500/20 text-amber-400',
    critical: 'bg-red-500/20 text-red-400',
  };

  const statusIcons: Record<TaskStatus, React.ReactNode> = {
    backlog: <Circle className="w-4 h-4 text-zinc-500" />,
    todo: <Circle className="w-4 h-4 text-zinc-400" />,
    in_progress: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    review: <Clock className="w-4 h-4 text-amber-400" />,
    done: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    pending_approval: <AlertCircle className="w-4 h-4 text-purple-400" />,
    revision_requested: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = artifact?.content || cliSession?.output || liveOutput || '';
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`rounded-xl border transition-all ${
        isLive 
          ? 'border-blue-500/50 bg-blue-500/5' 
          : task.status === 'done'
            ? 'border-zinc-800 bg-zinc-900/50'
            : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{statusIcons[task.status]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-white truncate">{task.title}</h4>
              {isLive && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{task.description}</p>
            )}
            <div className="flex items-center gap-3">
              {agentMeta && (
                <span 
                  className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${agentMeta.color}20`, color: agentMeta.color }}
                >
                  {agentMeta.title}
                </span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              {task.phase && (
                <span className="text-[10px] text-zinc-500">{task.phase}</span>
              )}
              {(artifact || cliSession || liveOutput) && (
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {artifact ? 'artifact' : cliSession ? 'output' : 'details'}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (artifact || cliSession || liveOutput) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="border-t border-zinc-800 pt-3">
                {/* Header with copy button */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    {artifact ? <FileText className="w-3 h-3" /> : <Terminal className="w-3 h-3" />}
                    {artifact ? 'Artifact' : 'CLI Output'}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Content */}
                <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
                  <div className="p-3 font-mono text-xs leading-relaxed max-h-80 overflow-auto">
                    {liveOutput && isLive ? (
                      <pre className="text-emerald-300 whitespace-pre-wrap">
                        {liveOutput}
                        <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5" />
                      </pre>
                    ) : artifact?.content ? (
                      <pre className="text-zinc-300 whitespace-pre-wrap">{artifact.content}</pre>
                    ) : cliSession?.output ? (
                      <pre className="text-emerald-300 whitespace-pre-wrap">{cliSession.output}</pre>
                    ) : null}
                    {cliSession?.error && (
                      <pre className="text-red-400 whitespace-pre-wrap mt-2">{cliSession.error}</pre>
                    )}
                  </div>
                </div>

                {/* CLI Session details */}
                {cliSession && (
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3" />
                      {cliSession.provider}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(cliSession.duration / 1000)}s
                    </span>
                    {cliSession.filesCreated && cliSession.filesCreated.length > 0 && (
                      <span className="text-emerald-400">+{cliSession.filesCreated.length} files</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TasksView({ project }: Props) {
  const [activeTab, setActiveTab] = useState<TaskViewTab>('board');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [cliSessions, setCLISessions] = useState<CLISession[]>([]);
  const [liveOutput, setLiveOutput] = useState<Record<string, string>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const { wsConnected } = useAppStore();

  useEffect(() => {
    loadCLISessions();
  }, [project.id]);

  useEffect(() => {
    const handleWSEvent = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.type === 'cli:output' && detail.payload.projectId === project.id) {
        const { sessionId, output, done } = detail.payload;
        
        if (!done) {
          setLiveOutput(prev => ({
            ...prev,
            [sessionId]: (prev[sessionId] || '') + output
          }));
          setActiveSessionId(sessionId);
          
          // Auto-scroll
          setTimeout(() => {
            if (outputRef.current) {
              outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }
          }, 50);
        } else {
          // Session complete, reload sessions
          loadCLISessions();
          setActiveSessionId(null);
        }
      }
    };

    window.addEventListener('ws-event', handleWSEvent as EventListener);
    return () => window.removeEventListener('ws-event', handleWSEvent as EventListener);
  }, [project.id]);

  async function loadCLISessions() {
    try {
      const sessions = await api.getCLISessions(project.id);
      setCLISessions(sessions);
    } catch (err) {
      console.error('Failed to load CLI sessions:', err);
    }
  }

  function toggleTask(taskId: string) {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  // Group tasks
  const inProgressTasks = project.tasks.filter(t => t.status === 'in_progress');
  const todoTasks = project.tasks.filter(t => t.status === 'todo' || t.status === 'backlog');
  const reviewTasks = project.tasks.filter(t => t.status === 'review');
  const doneTasks = project.tasks.filter(t => t.status === 'done').slice(-10).reverse();

  // Create agent map
  const agentMap = new Map<string, Agent>();
  project.agents.forEach(a => agentMap.set(a.id, a));

  // Create artifact map by task title matching
  const getArtifactForTask = (task: Task): Artifact | undefined => {
    return project.artifacts.find(a => 
      a.title.toLowerCase().includes(task.title.toLowerCase().slice(0, 20)) ||
      task.title.toLowerCase().includes(a.phase)
    );
  };

  // Get CLI session for task
  const getCLISessionForTask = (task: Task): CLISession | undefined => {
    return cliSessions.find(s => 
      s.agentId === task.assigneeId ||
      (s.task && task.title.toLowerCase().includes(s.task.toLowerCase().slice(0, 30)))
    );
  };

  // Get live output for task
  const getLiveOutputForTask = (task: Task): string | undefined => {
    const session = getCLISessionForTask(task);
    if (session && liveOutput[session.id]) {
      return liveOutput[session.id];
    }
    return undefined;
  };

  // Check if task has active CLI
  const isTaskLive = (task: Task): boolean => {
    return task.status === 'in_progress' && activeSessionId !== null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header tabs */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('board')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'board'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            Task Board
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'terminal'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Live Terminal
            {inProgressTasks.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {inProgressTasks.length}
              </span>
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {wsConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'board' ? (
          <div className="space-y-6">
            {/* In Progress - with live indicators */}
            {inProgressTasks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <h3 className="text-sm font-semibold text-white">In Progress</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                    {inProgressTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {inProgressTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agent={task.assigneeId ? agentMap.get(task.assigneeId) : undefined}
                      isExpanded={expandedTasks.has(task.id)}
                      onToggle={() => toggleTask(task.id)}
                      artifact={getArtifactForTask(task)}
                      cliSession={getCLISessionForTask(task)}
                      liveOutput={getLiveOutputForTask(task)}
                      isLive={isTaskLive(task)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Review */}
            {reviewTasks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">In Review</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                    {reviewTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {reviewTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agent={task.assigneeId ? agentMap.get(task.assigneeId) : undefined}
                      isExpanded={expandedTasks.has(task.id)}
                      onToggle={() => toggleTask(task.id)}
                      artifact={getArtifactForTask(task)}
                      cliSession={getCLISessionForTask(task)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Coming Up Next */}
            {todoTasks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Circle className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-semibold text-white">Coming Up Next</h3>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 text-xs">
                    {todoTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {todoTasks.slice(0, 5).map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agent={task.assigneeId ? agentMap.get(task.assigneeId) : undefined}
                      isExpanded={expandedTasks.has(task.id)}
                      onToggle={() => toggleTask(task.id)}
                    />
                  ))}
                  {todoTasks.length > 5 && (
                    <p className="text-xs text-zinc-500 text-center py-2">
                      +{todoTasks.length - 5} more tasks in backlog
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Recently Completed */}
            {doneTasks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Recently Completed</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                    {project.tasks.filter(t => t.status === 'done').length}
                  </span>
                </div>
                <div className="space-y-2">
                  {doneTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agent={task.assigneeId ? agentMap.get(task.assigneeId) : undefined}
                      isExpanded={expandedTasks.has(task.id)}
                      onToggle={() => toggleTask(task.id)}
                      artifact={getArtifactForTask(task)}
                      cliSession={getCLISessionForTask(task)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {project.tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <AlertCircle className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No tasks yet</p>
                <p className="text-xs mt-1">Tasks will appear when the project starts</p>
              </div>
            )}
          </div>
        ) : (
          /* Live Terminal View */
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">Live CLI Output</span>
              {activeSessionId && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Streaming...
                </span>
              )}
            </div>
            
            <div 
              ref={outputRef}
              className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 p-4 font-mono text-xs overflow-auto"
            >
              {Object.entries(liveOutput).length > 0 ? (
                Object.entries(liveOutput).map(([sessionId, output]) => (
                  <div key={sessionId} className="mb-4">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2 border-b border-zinc-800 pb-2">
                      <Terminal className="w-3 h-3" />
                      <span>Session: {sessionId.slice(0, 8)}...</span>
                    </div>
                    <pre className="text-emerald-300 whitespace-pre-wrap">{output}
                      {activeSessionId === sessionId && (
                        <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5" />
                      )}
                    </pre>
                  </div>
                ))
              ) : inProgressTasks.length > 0 ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Waiting for CLI output...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <Terminal className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No active CLI sessions</p>
                  <p className="text-xs mt-1">Output will appear when agents start coding</p>
                </div>
              )}
            </div>

            {/* Recent sessions list */}
            {cliSessions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-zinc-500 mb-2">Recent Sessions</h4>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {cliSessions.slice(0, 5).map(session => (
                    <button
                      key={session.id}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 text-left"
                    >
                      {session.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className="text-xs text-zinc-300 flex-1 truncate">
                        {session.agentRole?.toUpperCase() || session.provider}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {Math.round(session.duration / 1000)}s
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
