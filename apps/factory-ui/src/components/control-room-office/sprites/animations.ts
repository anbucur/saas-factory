export type AnimationState =
  | 'idle'
  | 'walk_down'
  | 'walk_left'
  | 'walk_right'
  | 'walk_up'
  | 'work'
  | 'deliver'
  | 'meeting'
  | 'celebrate';

export interface AnimationConfig {
  frames: number;
  duration: number;
  loop: boolean;
}

export const ANIMATION_CONFIGS: Record<AnimationState, AnimationConfig> = {
  idle: { frames: 4, duration: 200, loop: true },
  walk_down: { frames: 6, duration: 100, loop: true },
  walk_left: { frames: 6, duration: 100, loop: true },
  walk_right: { frames: 6, duration: 100, loop: true },
  walk_up: { frames: 6, duration: 100, loop: true },
  work: { frames: 4, duration: 300, loop: true },
  deliver: { frames: 4, duration: 150, loop: false },
  meeting: { frames: 4, duration: 200, loop: true },
  celebrate: { frames: 4, duration: 150, loop: false },
};

export const DIRECTION_ORDER = ['down', 'left', 'right', 'up'] as const;
export type WalkDirection = typeof DIRECTION_ORDER[number];

export function getWalkAnimation(direction: WalkDirection): AnimationState {
  return `walk_${direction}` as AnimationState;
}

export function getFacingDirection(
  dx: number,
  dy: number,
): WalkDirection {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

export function interpolateFrame(
  _state: AnimationState,
  elapsed: number,
  config: AnimationConfig
): number {
  const frameDuration = config.duration;
  const totalDuration = config.frames * frameDuration;
  const timeInLoop = elapsed % totalDuration;
  return Math.floor(timeInLoop / frameDuration);
}
