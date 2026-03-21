import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Users, MessageSquare, KanbanSquare, FileText, Activity, LayoutDashboard, Terminal } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store/store';
import { ProjectOverview } from '../components/project/ProjectOverview';
import { AgentTeam } from '../components/project/AgentTeam';
import { ConversationView } from '../components/project/ConversationView';
import { SprintBoard } from '../components/project/SprintBoard';
import { ArtifactsView } from '../components/project/ArtifactsView';
import { ActivityLog } from '../components/project/ActivityLog';

type Tab = 'overview' | 'team' | 'conversations' | 'board' | 'artifacts' | 'logs';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'board', label: 'Sprint Board', icon: KanbanSquare },
  { id: 'artifacts', label: 'Artifacts', icon: FileText },
  { id: 'logs', label: 'Activity', icon: Activity },
];

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codingAgent, setCodingAgent] = useState<{ available: boolean; name: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    loadProject();

    // Load coding agent status
    api.getCodingAgentStatus().then(setCodingAgent).catch(() => {});

    // Poll for updates every 3 seconds while project is in progress
    const interval = setInterval(() => {
      const state = useAppStore.getState();
      if (state.currentProject?.status === 'in_progress') {
        loadProject(true);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      setCurrentProject(null);
    };
  }, [id]);

  async function loadProject(silent = false) {
    try {
      if (!silent) setLoading(true);
      const data = await api.getProject(id!);
      setCurrentProject(data);
    } catch (err: any) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function handleStart() {
    try {
      await api.startProject(id!);
      loadProject();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handlePause() {
    try {
      await api.pauseProject(id!);
      loadProject();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !currentProject) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">{error || 'Project not found'}</p>
        <Link to="/" className="text-blue-400 hover:underline text-sm">Back to Dashboard</Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    planning: 'bg-zinc-500',
    in_progress: 'bg-amber-500 animate-pulse',
    paused: 'bg-yellow-500',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-white">{currentProject.name}</h1>
                <span className={`w-2 h-2 rounded-full ${statusColors[currentProject.status]}`} />
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-lg truncate">{currentProject.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {codingAgent && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${
                codingAgent.available
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-500'
              }`}>
                <Terminal className="w-3 h-3" />
                {codingAgent.available ? codingAgent.name : 'No coding agent'}
              </div>
            )}

            {currentProject.status === 'planning' && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Build
              </button>
            )}

            {currentProject.status === 'paused' && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}

            {currentProject.status === 'in_progress' && (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mb-px">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-400 bg-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === 'conversations' && currentProject.conversations?.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px]">
                  {currentProject.conversations.length}
                </span>
              )}
              {id === 'board' && currentProject.tasks?.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px]">
                  {currentProject.tasks.length}
                </span>
              )}
              {id === 'artifacts' && currentProject.artifacts?.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px]">
                  {currentProject.artifacts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && <ProjectOverview project={currentProject} />}
        {activeTab === 'team' && <AgentTeam project={currentProject} />}
        {activeTab === 'conversations' && <ConversationView project={currentProject} />}
        {activeTab === 'board' && <SprintBoard project={currentProject} />}
        {activeTab === 'artifacts' && <ArtifactsView project={currentProject} />}
        {activeTab === 'logs' && <ActivityLog project={currentProject} />}
      </div>
    </div>
  );
}
