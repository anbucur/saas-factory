import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, Clock, CheckCircle2, AlertCircle, Play, Trash2, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store/store';
import type { ProjectListItem, ProjectPhase } from '../types';
import { PHASE_META, AGENT_ROLE_META } from '../types';

export function Dashboard() {
  const { projects, setProjects } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const data = await api.listProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleStart(id: string) {
    try {
      await api.startProject(id);
      loadProjects();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    failed: projects.filter(p => p.status === 'failed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your SaaS projects and agent teams</p>
        </div>
        <Link
          to="/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FolderOpen className="w-5 h-5" />} label="Total Projects" value={stats.total} color="text-blue-400" />
        <StatCard icon={<Play className="w-5 h-5" />} label="Active" value={stats.active} color="text-amber-400" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Completed" value={stats.completed} color="text-emerald-400" />
        <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Failed" value={stats.failed} color="text-red-400" />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Projects */}
      {projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
          <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No projects yet</h3>
          <p className="text-sm text-zinc-500 mb-6">Create your first project to get started</p>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStart={() => handleStart(project.id)}
              onDelete={() => handleDelete(project.id, project.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function ProjectCard({ project, onStart, onDelete }: { project: ProjectListItem; onStart: () => void; onDelete: () => void }) {
  const statusColors: Record<string, string> = {
    planning: 'bg-zinc-500',
    in_progress: 'bg-amber-500',
    paused: 'bg-yellow-500',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
  };

  const statusLabels: Record<string, string> = {
    planning: 'Planning',
    in_progress: 'In Progress',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Failed',
  };

  const phaseMeta = PHASE_META[project.currentPhase as ProjectPhase];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-base font-semibold text-white">{project.name}</h3>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${statusColors[project.status]}`}>
              {statusLabels[project.status]}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{project.description}</p>

          {/* Phase & Progress */}
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            {phaseMeta && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: phaseMeta.color }} />
                {phaseMeta.label}
              </span>
            )}
            <span>{project.agentCount} agents</span>
            <span>{project.completedTaskCount}/{project.taskCount} tasks</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Progress bar */}
          {project.taskCount > 0 && (
            <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {project.status === 'planning' && (
            <button
              onClick={(e) => { e.preventDefault(); onStart(); }}
              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              title="Start project"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <Link
            to={`/project/${project.id}`}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title="View project"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          {project.status !== 'in_progress' && (
            <button
              onClick={(e) => { e.preventDefault(); onDelete(); }}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white transition-colors"
              title="Delete project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
