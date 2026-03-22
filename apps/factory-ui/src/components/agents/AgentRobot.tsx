import { motion } from 'framer-motion';
import type { AgentRole, AgentStatus } from '../../types';
import { AGENT_ROLE_META } from '../../types';
import { robotBounce } from '../../lib/animations';

interface AgentRobotProps {
  role: AgentRole;
  status: AgentStatus;
  size?: number;
}

const ROBOT_DESIGNS: Record<AgentRole, (color: string) => JSX.Element> = {
  pm: (color) => (
    <g>
      <rect x="18" y="8" width="28" height="36" rx="6" fill={color} opacity="0.9" />
      <rect x="22" y="14" width="20" height="14" rx="2" fill="#18181b" />
      <circle cx="28" cy="20" r="3" fill={color} />
      <circle cx="36" cy="20" r="3" fill={color} />
      <rect x="26" y="30" width="12" height="8" rx="1" fill="#18181b" />
      <rect x="32" y="4" width="4" height="8" rx="2" fill={color} />
      <circle cx="34" cy="3" r="4" fill={color} opacity="0.6" />
      <rect x="8" y="20" width="10" height="6" rx="2" fill={color} opacity="0.7" />
      <rect x="46" y="20" width="10" height="6" rx="2" fill={color} opacity="0.7" />
    </g>
  ),
  ba: (color) => (
    <g>
      <ellipse cx="32" cy="30" rx="18" ry="16" fill={color} opacity="0.9" />
      <rect x="20" y="18" width="24" height="16" rx="4" fill="#18181b" />
      <path d="M24 22 L28 28 L24 28 Z" fill={color} />
      <path d="M40 22 L36 28 L40 28 Z" fill={color} />
      <circle cx="26" cy="24" r="2" fill={color} />
      <circle cx="38" cy="24" r="2" fill={color} />
      <rect x="28" y="34" width="8" height="3" rx="1" fill="#18181b" />
      <circle cx="32" cy="10" r="8" stroke={color} strokeWidth="2" fill="none" />
      <line x1="38" y1="16" x2="44" y2="22" stroke={color} strokeWidth="2" />
    </g>
  ),
  architect: (color) => (
    <g>
      <rect x="14" y="14" width="36" height="32" rx="4" fill={color} opacity="0.9" />
      <path d="M14 14 L32 4 L50 14 Z" fill={color} />
      <rect x="22" y="20" width="20" height="12" rx="2" fill="#18181b" />
      <line x1="24" y1="24" x2="40" y2="24" stroke={color} strokeWidth="1" />
      <line x1="24" y1="28" x2="36" y2="28" stroke={color} strokeWidth="1" />
      <rect x="26" y="34" width="12" height="6" rx="1" fill="#18181b" />
      <rect x="6" y="22" width="8" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="50" y="22" width="8" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="18" y="4" width="28" height="3" rx="1" fill={color} opacity="0.5" />
    </g>
  ),
  frontend_dev: (color) => (
    <g>
      <rect x="12" y="10" width="40" height="32" rx="4" fill={color} opacity="0.9" />
      <rect x="16" y="14" width="32" height="22" rx="2" fill="#18181b" />
      <rect x="20" y="18" width="10" height="8" rx="1" fill={color} opacity="0.6" />
      <rect x="34" y="18" width="10" height="8" rx="1" fill={color} opacity="0.4" />
      <rect x="20" y="28" width="24" height="4" rx="1" fill={color} opacity="0.3" />
      <rect x="28" y="42" width="8" height="6" fill={color} />
      <rect x="22" y="48" width="20" height="3" rx="1" fill={color} opacity="0.7" />
      <circle cx="26" cy="22" r="2" fill={color} />
      <circle cx="38" cy="22" r="2" fill={color} />
    </g>
  ),
  backend_dev: (color) => (
    <g>
      <rect x="14" y="8" width="36" height="40" rx="4" fill={color} opacity="0.9" />
      <rect x="20" y="14" width="24" height="6" rx="2" fill="#18181b" />
      <circle cx="26" cy="17" r="2" fill="#22c55e" />
      <circle cx="32" cy="17" r="2" fill="#22c55e" />
      <circle cx="38" cy="17" r="2" fill="#ef4444" />
      <rect x="20" y="24" width="24" height="16" rx="2" fill="#18181b" />
      <text x="22" y="34" fill={color} fontSize="6" fontFamily="monospace">{'{ }'}</text>
      <rect x="20" y="42" width="24" height="4" rx="1" fill="#18181b" />
      <rect x="6" y="16" width="8" height="24" rx="2" fill={color} opacity="0.6" />
      <rect x="50" y="16" width="8" height="24" rx="2" fill={color} opacity="0.6" />
    </g>
  ),
  qa: (color) => (
    <g>
      <circle cx="32" cy="28" r="20" fill={color} opacity="0.9" />
      <circle cx="32" cy="28" r="14" stroke="#18181b" strokeWidth="2" fill="none" />
      <rect x="26" y="22" width="12" height="10" rx="2" fill="#18181b" />
      <circle cx="29" cy="26" r="2" fill={color} />
      <circle cx="35" cy="26" r="2" fill={color} />
      <rect x="28" y="32" width="8" height="2" rx="1" fill={color} />
      <line x1="18" y1="14" x2="46" y2="42" stroke={color} strokeWidth="3" />
      <circle cx="32" cy="6" r="4" fill={color} />
      <rect x="6" y="26" width="6" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="52" y="26" width="6" height="4" rx="1" fill={color} opacity="0.7" />
    </g>
  ),
  devops: (color) => (
    <g>
      <rect x="16" y="12" width="32" height="34" rx="6" fill={color} opacity="0.9" />
      <circle cx="32" cy="24" r="10" stroke="#18181b" strokeWidth="3" fill="none" />
      <circle cx="32" cy="24" r="4" fill="#18181b" />
      <rect x="20" y="36" width="24" height="6" rx="2" fill="#18181b" />
      <rect x="22" y="38" width="6" height="2" rx="1" fill="#22c55e" />
      <rect x="30" y="38" width="6" height="2" rx="1" fill="#22c55e" />
      <rect x="38" y="38" width="4" height="2" rx="1" fill="#f59e0b" />
      <circle cx="32" cy="6" r="5" fill={color} opacity="0.6" />
      <path d="M26 6 Q32 0 38 6" stroke={color} strokeWidth="2" fill="none" />
      <rect x="8" y="20" width="8" height="6" rx="2" fill={color} opacity="0.7" />
      <rect x="48" y="20" width="8" height="6" rx="2" fill={color} opacity="0.7" />
    </g>
  ),
  ux_designer: (color) => (
    <g>
      <rect x="12" y="14" width="40" height="28" rx="6" fill={color} opacity="0.9" />
      <circle cx="22" cy="24" r="6" stroke="#18181b" strokeWidth="2" fill="none" />
      <circle cx="22" cy="24" r="2" fill="#18181b" />
      <rect x="32" y="20" width="14" height="10" rx="2" fill="#18181b" />
      <line x1="34" y1="23" x2="42" y2="23" stroke={color} strokeWidth="1" />
      <line x1="34" y1="26" x2="40" y2="26" stroke={color} strokeWidth="1" />
      <rect x="22" y="42" width="20" height="3" rx="1" fill="#18181b" />
      <circle cx="32" cy="6" r="4" fill={color} />
      <rect x="30" y="6" width="4" height="8" rx="1" fill={color} />
      <path d="M28 10 L32 6 L36 10" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="6" y="22" width="6" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="52" y="22" width="6" height="4" rx="1" fill={color} opacity="0.7" />
    </g>
  ),
};

export function AgentRobot({ role, status, size = 64 }: AgentRobotProps) {
  const color = AGENT_ROLE_META[role].color;
  const RobotSVG = ROBOT_DESIGNS[role];

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      variants={robotBounce}
      initial="idle"
      animate={status}
      style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
    >
      {RobotSVG(color)}
    </motion.svg>
  );
}
