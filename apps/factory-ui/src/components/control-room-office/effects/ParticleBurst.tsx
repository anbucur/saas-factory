import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParticleBurstProps {
  x: number;
  y: number;
  trigger: boolean;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
}

const PARTICLE_COLORS = ['#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#FEF3C7'];

export function ParticleBurst({ x, y, trigger, onComplete }: ParticleBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x,
        y,
        angle: (i / 12) * Math.PI * 2,
        distance: 30 + Math.random() * 30,
        size: 4 + Math.random() * 4,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      }));
      setParticles(newParticles);

      const timeout = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 600);

      return () => clearTimeout(timeout);
    }
  }, [trigger, x, y, onComplete]);

  return (
    <AnimatePresence>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            x: particle.x,
            y: particle.y,
            scale: 1,
            opacity: 1,
          }}
          animate={{
            x: particle.x + Math.cos(particle.angle) * particle.distance,
            y: particle.y + Math.sin(particle.angle) * particle.distance,
            scale: 0,
            opacity: 0,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.5,
            ease: 'easeOut',
          }}
          className="absolute pointer-events-none"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: '50%',
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
        />
      ))}
    </AnimatePresence>
  );
}

export default ParticleBurst;
