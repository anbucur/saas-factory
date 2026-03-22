import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';

interface ComponentBoxProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'purple' | 'green' | 'amber' | 'cyan' | 'zinc';
  active?: boolean;
  glow?: boolean;
  className?: string;
  onClick?: () => void;
  pulse?: boolean;
}

const colorMap = {
  blue: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    text: 'text-blue-400',
    glow: 'glow-blue',
  },
  purple: {
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    text: 'text-purple-400',
    glow: 'glow-purple',
  },
  green: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    glow: 'glow-green',
  },
  amber: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    text: 'text-amber-400',
    glow: 'glow-amber',
  },
  cyan: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/5',
    text: 'text-cyan-400',
    glow: 'glow-cyan',
  },
  zinc: {
    border: 'border-zinc-700',
    bg: 'bg-zinc-900/50',
    text: 'text-zinc-400',
    glow: '',
  },
};

export const ComponentBox = memo(function ComponentBox({
  children,
  title,
  icon,
  color = 'zinc',
  active = false,
  glow = false,
  className,
  onClick,
  pulse = false,
}: ComponentBoxProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        'relative rounded-xl border transition-all duration-300 overflow-hidden',
        colors.border,
        active ? colors.bg : 'bg-zinc-900/30',
        glow && active && colors.glow,
        onClick && 'cursor-pointer hover:border-opacity-60',
        pulse && 'animate-data-pulse',
        className
      )}
      initial={false}
      animate={{
        scale: active ? 1 : 0.98,
        opacity: active ? 1 : 0.8,
      }}
      transition={{ duration: 0.2 }}
      style={{ color: active ? undefined : 'currentColor' }}
    >
      {title && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50">
          {icon && <span className={colors.text}>{icon}</span>}
          <span className="text-xs font-medium text-zinc-300">{title}</span>
          {active && (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400">active</span>
            </span>
          )}
        </div>
      )}
      <div className="p-3">{children}</div>
    </motion.div>
  );
});
