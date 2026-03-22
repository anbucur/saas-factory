import { useState, useEffect, useMemo } from 'react';
import type { AgentRole } from '../../types';
import { CharacterBuilder } from './sprites/CharacterBuilder';
import { ANIMATION_CONFIGS, type AnimationState } from './sprites/animations';
import { useCharacterMovement } from './hooks/useCharacterMovement';
import { NameLabel } from './NameLabel';
import type { Position } from './data/layoutPositions';

interface PixelCharacterProps {
  agentId: string;
  name: string;
  role: AgentRole;
  status: string;
  position: Position;
  targetPosition?: Position | null;
  size?: number;
  onReachTarget?: () => void;
}

const STATUS_TO_ANIMATION: Record<string, AnimationState> = {
  idle: 'idle',
  thinking: 'idle',
  working: 'work',
  reviewing: 'work',
  blocked: 'idle',
  done: 'celebrate',
  delivering: 'deliver',
  walking: 'walk_down',
  meeting: 'meeting',
};

export function PixelCharacter({
  agentId,
  name,
  role,
  status,
  position,
  targetPosition,
  size = 64,
  onReachTarget,
}: PixelCharacterProps) {
  const [frame, setFrame] = useState(0);

  const animationState = STATUS_TO_ANIMATION[status] || 'idle';
  const isWalking = animationState.startsWith('walk_');

  const { currentPosition, direction } = useCharacterMovement({
    position,
    targetPosition: targetPosition || null,
    enabled: isWalking,
    onReachTarget,
  });

  const animationConfig = useMemo(
    () => ANIMATION_CONFIGS[animationState] || ANIMATION_CONFIGS.idle,
    [animationState]
  );

  useEffect(() => {
    let lastTime = performance.now();
    let accumulated = 0;
    let currentFrame = 0;

    const tick = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;
      accumulated += delta;

      const frameDuration = animationConfig.duration;
      const totalDuration = animationConfig.frames * frameDuration;
      const loopedElapsed = accumulated % totalDuration;
      const newFrame = Math.floor(loopedElapsed / frameDuration);

      if (newFrame !== currentFrame) {
        currentFrame = newFrame;
        setFrame(newFrame);
      }

      requestAnimationFrame(tick);
    };

    const rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animationConfig]);

  const facingLeft = direction === 'left';
  const hairColor = useMemo(() => {
    const colors = [
      '#4C1D95', '#0F766E', '#1E40AF', '#9D174D',
      '#164E63', '#065F46', '#7F1D1D', '#7C2D12',
    ];
    return colors[agentId.charCodeAt(0) % colors.length];
  }, [agentId]);

  const skinTone = useMemo(() => {
    const tones = ['#FFD9B3', '#F4C495', '#D4A574', '#C4A484'];
    return tones[agentId.charCodeAt(1 % agentId.length) % tones.length];
  }, [agentId]);

  const scaleX = facingLeft ? -1 : 1;

  return (
    <div
      className="absolute transition-opacity duration-200"
      style={{
        left: currentPosition.x,
        top: currentPosition.y,
        width: size,
        height: size,
        transform: `scaleX(${scaleX})`,
        willChange: 'transform, left, top',
      }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className={`
            ${status === 'working' ? 'animate-bounce' : ''}
            ${status === 'done' || animationState === 'celebrate' ? 'animate-pulse' : ''}
          `}
          style={{
            animationDuration:
              status === 'working'
                ? '0.5s'
                : status === 'done' || animationState === 'celebrate'
                  ? '0.3s'
                  : undefined,
            animationIterationCount: 'infinite',
          }}
        >
          <CharacterBuilder
            role={role}
            frame={frame}
            animationState={animationState}
            size={size}
            hairColor={hairColor}
            skinTone={skinTone}
          />
        </div>

        <NameLabel
          name={name}
          role={role.replace('_', ' ').toUpperCase()}
          isActive={status === 'working' || status === 'thinking'}
        />

        {status === 'thinking' && (
          <div
            className="absolute -top-4 right-0 animate-bounce"
            style={{ animationDuration: '1s' }}
          >
            <div className="bg-amber-400/90 rounded-full p-1 shadow-lg">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21h6M12 3a6 6 0 0 0-6 6c0 2.22 1.21 4.16 3 5.19V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.81c1.79-1.03 3-2.97 3-5.19a6 6 0 0 0-6-6z"
                  stroke="#1a1a2e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}

        {status === 'blocked' && (
          <div
            className="absolute -top-4 right-0 animate-pulse"
          >
            <div className="bg-red-500/90 rounded-full p-1 shadow-lg">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                <line x1="15" y1="9" x2="9" y2="15" stroke="white" strokeWidth="2" />
                <line x1="9" y1="9" x2="15" y2="15" stroke="white" strokeWidth="2" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PixelCharacter;
