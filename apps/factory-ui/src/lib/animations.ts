import { Variants } from 'framer-motion';

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.3 } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export const pulseGlow: Variants = {
  initial: { boxShadow: '0 0 0px rgba(var(--glow-color), 0)' },
  animate: {
    boxShadow: [
      '0 0 10px rgba(var(--glow-color), 0.3)',
      '0 0 30px rgba(var(--glow-color), 0.6)',
      '0 0 10px rgba(var(--glow-color), 0.3)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const orbPulse: Variants = {
  idle: {
    scale: [1, 1.05, 1],
    opacity: [0.6, 0.7, 0.6],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  thinking: {
    scale: [1, 1.1, 1],
    opacity: [0.7, 0.9, 0.7],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
  working: {
    scale: [1, 1.15, 1],
    opacity: [0.8, 1, 0.8],
    transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
  },
  reviewing: {
    scale: [1, 1.08, 1],
    opacity: [0.7, 0.85, 0.7],
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
  },
  done: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.3 },
  },
  blocked: {
    scale: [1, 1.1, 1],
    opacity: [0.5, 0.8, 0.5],
    transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const robotBounce: Variants = {
  idle: { y: 0 },
  thinking: {
    y: [0, -3, 0],
    transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
  },
  working: {
    y: [0, -5, 0],
    transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
  },
  done: { y: 0 },
  blocked: {
    y: [0, -2, 0],
    rotate: [0, -2, 2, 0],
    transition: { duration: 0.3, repeat: Infinity },
  },
};

export const typewriter: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.02 },
  }),
};

export const pipelinePhase: Variants = {
  inactive: { opacity: 0.4, scale: 0.95 },
  active: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 },
  },
  completed: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 },
  },
};

export const particleFloat: Variants = {
  animate: (i: number) => ({
    y: [0, -20, 0],
    x: [0, Math.sin(i) * 10, 0],
    opacity: [0.3, 0.6, 0.3],
    transition: {
      duration: 3 + (i % 3),
      repeat: Infinity,
      ease: 'easeInOut',
      delay: i * 0.2,
    },
  }),
};

export const activitySlideIn: Variants = {
  hidden: { opacity: 0, x: -20, height: 0 },
  visible: {
    opacity: 1,
    x: 0,
    height: 'auto',
    transition: { duration: 0.3, height: { duration: 0.2 } },
  },
  exit: {
    opacity: 0,
    x: 20,
    height: 0,
    transition: { duration: 0.2 },
  },
};

export const counterAnimate = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200 } },
};
