"use client";

import { 
  User, 
  Bot, 
  Brain, 
  Code, 
  Database, 
  FileCode, 
  Cpu,
  ArrowRight
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { AgentStatus, ProjectPhase } from "../../types";
import { AGENT_ROLE_META, PHASE_META } from "../../types";

interface ArchitectureFlowProps {
  className?: string;
  currentPhase?: ProjectPhase;
  agentStatuses?: Record<string, AgentStatus>;
  codingAgentProvider?: 'claude-code' | 'opencode';
  isActive?: boolean;
}

const ArchitectureFlow = ({
  className,
  currentPhase = 'requirements',
  agentStatuses = {},
  codingAgentProvider = 'opencode',
  isActive = false,
}: ArchitectureFlowProps) => {
  const getPhaseColor = (phase: string) => {
    return PHASE_META[phase as ProjectPhase]?.color || '#3b82f6';
  };

  const activeColor = getPhaseColor(currentPhase);

  return (
    <div
      className={cn(
        "relative flex min-h-[400px] w-full flex-col items-center",
        className
      )}
    >
      <svg
        className="h-full w-full text-zinc-600"
        width="100%"
        height="100%"
        viewBox="0 0 300 200"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="flow-gradient-blue" fx="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="flow-gradient-purple" fx="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="flow-gradient-cyan" fx="1">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="flow-gradient-green" fx="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          
          <mask id="flow-mask-1">
            <path d="M 50 30 v 20 q 0 5 5 5 h 90 q 5 0 5 5 v 20" strokeWidth="2" stroke="white" fill="none" />
          </mask>
          <mask id="flow-mask-2">
            <path d="M 150 60 v 10 q 0 5 5 5 h 40 q 5 0 5 5 v 15" strokeWidth="2" stroke="white" fill="none" />
          </mask>
          <mask id="flow-mask-3">
            <path d="M 200 95 v 15 q 0 5 -5 5 h -40 q -5 0 -5 5 v 15" strokeWidth="2" stroke="white" fill="none" />
          </mask>
          <mask id="flow-mask-4">
            <path d="M 150 135 v 20" strokeWidth="2" stroke="white" fill="none" />
          </mask>
        </defs>

        <g stroke="currentColor" fill="none" strokeWidth="0.5" strokeDasharray="50 50" pathLength="100">
          <path d="M 50 30 v 20 q 0 5 5 5 h 90 q 5 0 5 5 v 20">
            <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1s" fill="freeze" />
          </path>
          <path d="M 150 60 v 10 q 0 5 5 5 h 40 q 5 0 5 5 v 15">
            <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1s" begin="0.3s" fill="freeze" />
          </path>
          <path d="M 200 95 v 15 q 0 5 -5 5 h -40 q -5 0 -5 5 v 15">
            <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1s" begin="0.6s" fill="freeze" />
          </path>
          <path d="M 150 135 v 20">
            <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1s" begin="0.9s" fill="freeze" />
          </path>
        </g>

        {isActive && (
          <>
            <g mask="url(#flow-mask-1)">
              <circle className="arch-flow-light-1" cx="0" cy="0" r="8" fill="url(#flow-gradient-blue)" />
            </g>
            <g mask="url(#flow-mask-2)">
              <circle className="arch-flow-light-2" cx="0" cy="0" r="8" fill="url(#flow-gradient-purple)" />
            </g>
            <g mask="url(#flow-mask-3)">
              <circle className="arch-flow-light-3" cx="0" cy="0" r="8" fill="url(#flow-gradient-cyan)" />
            </g>
            <g mask="url(#flow-mask-4)">
              <circle className="arch-flow-light-4" cx="0" cy="0" r="8" fill="url(#flow-gradient-green)" />
            </g>
          </>
        )}
      </svg>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-2 left-[10%] transform -translate-x-1/2">
          <NodeComponent
            icon={<User className="w-5 h-5" />}
            label="User Request"
            color="#3b82f6"
            active={true}
          />
        </div>

        <div className="absolute top-[22%] left-[10%] transform -translate-x-1/2">
          <NodeComponent
            icon={<Bot className="w-5 h-5" />}
            label="PM Agent"
            subLabel="Orchestrator"
            color={AGENT_ROLE_META.pm.color}
            active={agentStatuses['pm'] === 'working'}
          />
        </div>

        <div className="absolute top-[22%] left-[30%]">
          <NodeComponent
            icon={<Bot className="w-5 h-5" />}
            label="7 Agents"
            subLabel="Parallel"
            color="#8b5cf6"
            active={Object.values(agentStatuses).some(s => s === 'working')}
          />
        </div>

        <div className="absolute top-[38%] left-[45%] transform -translate-x-1/2">
          <NodeComponent
            icon={<Brain className="w-5 h-5" />}
            label="MiniMax LLM"
            subLabel="Planning"
            color="#f59e0b"
            active={isActive}
            wide
          />
        </div>

        <div className="absolute top-[55%] left-[60%] transform -translate-x-1/2">
          <div className={cn(
            "flex flex-col items-center p-3 rounded-xl border transition-all",
            isActive ? "border-cyan-500/50 bg-cyan-500/10" : "border-zinc-700 bg-zinc-900"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                codingAgentProvider === 'opencode' ? "bg-emerald-500/20" : "bg-blue-500/20"
              )}>
                <Code className={cn(
                  "w-4 h-4",
                  codingAgentProvider === 'opencode' ? "text-emerald-400" : "text-blue-400"
                )} />
              </div>
              <ArrowRight className="w-3 h-3 text-zinc-500" />
              <div className={cn(
                "p-2 rounded-lg",
                codingAgentProvider === 'opencode' ? "bg-blue-500/20" : "bg-emerald-500/20"
              )}>
                <Cpu className={cn(
                  "w-4 h-4",
                  codingAgentProvider === 'opencode' ? "text-blue-400" : "text-emerald-400"
                )} />
              </div>
            </div>
            <span className="text-[10px] text-zinc-400 mt-2">Coding Agent</span>
            <span className={cn(
              "text-[9px] font-medium",
              codingAgentProvider === 'opencode' ? "text-emerald-400" : "text-blue-400"
            )}>
              {codingAgentProvider === 'opencode' ? 'OpenCode' : 'Claude Code'}
            </span>
          </div>
        </div>

        <div className="absolute top-[75%] left-[45%] transform -translate-x-1/2">
          <NodeComponent
            icon={<FileCode className="w-5 h-5" />}
            label="Generated Files"
            subLabel="src / api / db"
            color="#06b6d4"
            active={isActive}
            wide
          />
        </div>

        <div className="absolute bottom-2 left-[45%] transform -translate-x-1/2">
          <NodeComponent
            icon={<Database className="w-5 h-5" />}
            label="SQLite Database"
            subLabel="Projects • Tasks • Agents"
            color="#10b981"
            active={true}
            wide
          />
        </div>

        <div className="absolute top-[10%] right-[5%]">
          <div className={cn(
            "px-3 py-2 rounded-lg border text-xs",
            isActive ? "border-cyan-500/30 bg-cyan-500/10" : "border-zinc-700 bg-zinc-900"
          )}>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isActive ? "bg-cyan-400 animate-pulse" : "bg-zinc-600"
              )} />
              <span className="text-zinc-300">
                Phase: <span className="font-medium" style={{ color: activeColor }}>
                  {PHASE_META[currentPhase]?.label}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NodeComponentProps {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  color: string;
  active?: boolean;
  wide?: boolean;
}

const NodeComponent = ({ icon, label, subLabel, color, active, wide }: NodeComponentProps) => (
  <div
    className={cn(
      "flex flex-col items-center p-2 rounded-xl border transition-all",
      active ? "border-current bg-current/10" : "border-zinc-700 bg-zinc-900",
      wide && "px-4"
    )}
    style={active ? { borderColor: `${color}50`, backgroundColor: `${color}10` } : undefined}
  >
    <div
      className={cn(
        "p-2 rounded-lg transition-all",
        active && "animate-pulse"
      )}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {icon}
    </div>
    <span className="text-[10px] text-zinc-300 mt-1 font-medium">{label}</span>
    {subLabel && <span className="text-[9px] text-zinc-500">{subLabel}</span>}
  </div>
);

export default ArchitectureFlow;
