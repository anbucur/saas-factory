import { useState } from 'react';
import type { ProjectDetail, AgentRole, ArtifactType } from '../../types';
import { AGENT_ROLE_META, PHASE_META } from '../../types';
import { FileText, Code, Shield, Rocket, TestTube, BookOpen, X } from 'lucide-react';

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

export function ArtifactsView({ project }: Props) {
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

  const artifact = selectedArtifact
    ? project.artifacts.find(a => a.id === selectedArtifact)
    : null;

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
      <div className={`${selectedArtifact ? 'w-80' : 'flex-1'} overflow-auto p-6 transition-all`}>
        <div className="grid gap-3" style={{ gridTemplateColumns: selectedArtifact ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {project.artifacts.map((art) => {
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
                    <div className="text-[10px] text-zinc-600 mt-1">
                      v{art.version} - {new Date(art.createdAt).toLocaleString()}
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
            <h3 className="text-sm font-medium text-white">{artifact.title}</h3>
            <button
              onClick={() => setSelectedArtifact(null)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
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
