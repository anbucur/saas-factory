import { useState, useMemo } from 'react';
import type { ProjectDetail, AgentRole, ArtifactType, ProjectPhase } from '../../types';
import { AGENT_ROLE_META, PHASE_META, PHASE_ORDER } from '../../types';
import { FileText, Code, Shield, Rocket, TestTube, BookOpen, X, Search, Filter, Download, Copy, Check } from 'lucide-react';

interface Props {
  project: ProjectDetail;
}

const ARTIFACT_ICONS: Record<ArtifactType, any> = {
  spec: FileText,
  architecture: BookOpen,
  code: Code,
  test_report: TestTube,
  review: Shield,
  deployment_config: Rocket,
  documentation: FileText,
};

const ARTIFACT_COLORS: Record<ArtifactType, string> = {
  spec: 'text-purple-400 bg-purple-500/10',
  architecture: 'text-amber-400 bg-amber-500/10',
  code: 'text-cyan-400 bg-cyan-500/10',
  test_report: 'text-red-400 bg-red-500/10',
  review: 'text-blue-400 bg-blue-500/10',
  deployment_config: 'text-emerald-400 bg-emerald-500/10',
  documentation: 'text-zinc-400 bg-zinc-500/10',
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  spec: 'Specification',
  architecture: 'Architecture',
  code: 'Code',
  test_report: 'Test Report',
  review: 'Review',
  deployment_config: 'Deploy Config',
  documentation: 'Documentation',
};

export function ArtifactsView({ project }: Props) {
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ArtifactType | ''>('');
  const [filterPhase, setFilterPhase] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const filteredArtifacts = useMemo(() => {
    let result = project.artifacts;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(lower) || a.content.toLowerCase().includes(lower)
      );
    }
    if (filterType) {
      result = result.filter(a => a.type === filterType);
    }
    if (filterPhase) {
      result = result.filter(a => a.phase === filterPhase);
    }
    return result;
  }, [project.artifacts, searchQuery, filterType, filterPhase]);

  const artifact = selectedArtifact
    ? project.artifacts.find(a => a.id === selectedArtifact)
    : null;

  const activeTypes = [...new Set(project.artifacts.map(a => a.type))];
  const activePhases = [...new Set(project.artifacts.map(a => a.phase))];

  function handleCopy() {
    if (!artifact) return;
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleExport() {
    if (!artifact) return;
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (project.artifacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No artifacts yet</h3>
          <p className="text-sm text-zinc-500">Documents and deliverables will appear here as agents complete their work</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Artifact list */}
      <div className={`${selectedArtifact ? 'w-96' : 'flex-1'} overflow-auto p-6 transition-all`}>
        {/* Search and Filters */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artifacts..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ArtifactType | '')}
              className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value="">All types</option>
              {activeTypes.map(t => (
                <option key={t} value={t}>{ARTIFACT_TYPE_LABELS[t as ArtifactType] || t}</option>
              ))}
            </select>
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value="">All phases</option>
              {activePhases.map(p => (
                <option key={p} value={p}>{PHASE_META[p as ProjectPhase]?.label || p}</option>
              ))}
            </select>
            <span className="ml-auto text-xs text-zinc-600 self-center">
              {filteredArtifacts.length} of {project.artifacts.length}
            </span>
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: selectedArtifact ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filteredArtifacts.map((art) => {
            const Icon = ARTIFACT_ICONS[art.type] || FileText;
            const colorClass = ARTIFACT_COLORS[art.type] || 'text-zinc-400 bg-zinc-500/10';
            const agent = project.agents.find(a => a.id === art.agentId);
            const agentMeta = agent ? AGENT_ROLE_META[agent.role as AgentRole] : null;
            const phaseMeta = PHASE_META[art.phase as keyof typeof PHASE_META];

            return (
              <button
                key={art.id}
                onClick={() => setSelectedArtifact(art.id)}
                className={`text-left p-4 bg-zinc-900 border rounded-xl transition-colors ${
                  selectedArtifact === art.id
                    ? 'border-blue-500/50 bg-blue-500/5'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{art.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {agentMeta && (
                        <span className="text-[10px] text-zinc-500">{agentMeta.emoji} {agentMeta.title}</span>
                      )}
                      {phaseMeta && (
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: phaseMeta.color }} />
                          {phaseMeta.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-600">
                        v{art.version}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {new Date(art.createdAt).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {Math.round(art.content.length / 1024)}KB
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Artifact detail */}
      {artifact && (
        <div className="flex-1 border-l border-zinc-800 overflow-auto">
          <div className="sticky top-0 flex items-center justify-between px-6 py-3 bg-zinc-950 border-b border-zinc-800 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-sm font-medium text-white truncate">{artifact.title}</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                {ARTIFACT_TYPE_LABELS[artifact.type] || artifact.type}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedArtifact(null)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              {artifact.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
