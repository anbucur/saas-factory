import { memo } from 'react';
import { motion } from 'framer-motion';
import { Container, Triangle, ExternalLink, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { Deployment, DeploymentStatus } from '../../../types';
import { ComponentBox } from './ComponentBox';

interface DeploymentLayerProps {
  deployments: Deployment[];
}

const STATUS_CONFIG: Record<DeploymentStatus, { color: 'green' | 'amber' | 'zinc' | 'cyan'; label: string }> = {
  pending: { color: 'zinc', label: 'Pending' },
  building: { color: 'amber', label: 'Building' },
  running: { color: 'green', label: 'Running' },
  failed: { color: 'amber', label: 'Failed' },
  stopped: { color: 'zinc', label: 'Stopped' },
  deploying: { color: 'cyan', label: 'Deploying' },
  obsolete: { color: 'zinc', label: 'Obsolete' },
};

const STRATEGY_ICONS = {
  docker: Container,
  vercel: Triangle,
  static: Container,
};

export const DeploymentLayer = memo(function DeploymentLayer({ deployments }: DeploymentLayerProps) {
  if (deployments.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-zinc-500 text-sm">
        <span className="flex items-center gap-2">
          <Container className="w-4 h-4" />
          No deployments yet
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-4 justify-center">
      {deployments.slice(0, 2).map((deployment) => {
        const config = STATUS_CONFIG[deployment.status];
        const Icon = STRATEGY_ICONS[deployment.strategy as keyof typeof STRATEGY_ICONS] || Container;
        const isActive = deployment.status === 'running' || deployment.status === 'building';

        return (
          <ComponentBox
            key={deployment.id}
            title={deployment.strategy === 'vercel' ? 'Vercel' : 'Docker'}
            icon={<Icon className="w-4 h-4" />}
            color={config.color}
            active={isActive}
            glow={isActive}
            className="flex-1 max-w-xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {deployment.status === 'building' && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                  {deployment.status === 'running' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {deployment.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  <span className="text-xs text-zinc-300">{config.label}</span>
                </div>
                {deployment.url && (
                  <a
                    href={deployment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              {deployment.port && (
                <div className="text-xs text-zinc-500">
                  Port: {deployment.port}
                </div>
              )}

              {deployment.status === 'building' && (
                <motion.div
                  className="h-1 bg-zinc-800 rounded-full overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="h-full bg-amber-500"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '50%' }}
                  />
                </motion.div>
              )}
            </div>
          </ComponentBox>
        );
      })}
    </div>
  );
});
