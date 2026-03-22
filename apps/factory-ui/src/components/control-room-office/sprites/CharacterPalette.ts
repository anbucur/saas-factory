import type { AgentRole } from '../../../types';

export interface CharacterColors {
  shirt: string;
  hair: string;
  skin: string;
  accent: string;
}

export const CHARACTER_PALETTE: Record<AgentRole, CharacterColors> = {
  pm: {
    shirt: '#8B5CF6',
    hair: '#4C1D95',
    skin: '#FFD9B3',
    accent: '#C4B5FD',
  },
  ba: {
    shirt: '#14B8A6',
    hair: '#0F766E',
    skin: '#F4C495',
    accent: '#5EEAD4',
  },
  architect: {
    shirt: '#3B82F6',
    hair: '#1E40AF',
    skin: '#FFD9B3',
    accent: '#93C5FD',
  },
  ux_designer: {
    shirt: '#EC4899',
    hair: '#9D174D',
    skin: '#FFD9B3',
    accent: '#F9A8D4',
  },
  frontend_dev: {
    shirt: '#06B6D4',
    hair: '#164E63',
    skin: '#F4C495',
    accent: '#67E8F9',
  },
  backend_dev: {
    shirt: '#10B981',
    hair: '#065F46',
    skin: '#FFD9B3',
    accent: '#6EE7B7',
  },
  qa: {
    shirt: '#EF4444',
    hair: '#7F1D1D',
    skin: '#D4A574',
    accent: '#FCA5A5',
  },
  devops: {
    shirt: '#F97316',
    hair: '#7C2D12',
    skin: '#FFD9B3',
    accent: '#FDBA74',
  },
};

export const HAIR_COLORS = [
  '#4C1D95', '#0F766E', '#1E40AF', '#9D174D',
  '#164E63', '#065F46', '#7F1D1D', '#7C2D12',
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
];

export const SKIN_TONES = ['#FFD9B3', '#F4C495', '#D4A574', '#C4A484'];

export function getRandomHairColor(seed: string): string {
  const index = seed.charCodeAt(0) % HAIR_COLORS.length;
  return HAIR_COLORS[index];
}

export function getSkinFromSeed(seed: string): string {
  const index = seed.charCodeAt(1 % seed.length) % SKIN_TONES.length;
  return SKIN_TONES[index];
}
