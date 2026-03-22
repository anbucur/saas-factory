import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { particleFloat } from '../../lib/animations';

interface ParticleBackgroundProps {
  count?: number;
  color?: string;
}

export function ParticleBackground({ count = 50, color = '#3b82f6' }: ParticleBackgroundProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${color}10 0%, transparent 50%)`,
        }}
      />
      
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: color,
            opacity: particle.opacity,
          }}
          custom={particle.id}
          variants={particleFloat}
          animate="animate"
        />
      ))}

      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to top, #09090b, transparent)',
        }}
      />
    </div>
  );
}
