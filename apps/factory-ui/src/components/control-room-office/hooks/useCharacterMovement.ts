import { useState, useEffect, useRef, useCallback } from 'react';
import type { Position } from '../data/layoutPositions';
import { getFacingDirection } from '../sprites/animations';
import type { WalkDirection } from '../sprites/animations';

const LERP_FACTOR = 0.15;
const REACHED_THRESHOLD = 2;

interface UseCharacterMovementOptions {
  position: Position;
  targetPosition: Position | null;
  enabled?: boolean;
  onReachTarget?: () => void;
}

interface UseCharacterMovementResult {
  currentPosition: Position;
  isMoving: boolean;
  direction: WalkDirection;
}

export function useCharacterMovement({
  position,
  targetPosition,
  enabled = true,
  onReachTarget,
}: UseCharacterMovementOptions): UseCharacterMovementResult {
  const [currentPosition, setCurrentPosition] = useState<Position>(position);
  const [isMoving, setIsMoving] = useState(false);
  const [direction, setDirection] = useState<WalkDirection>('down');
  const animationRef = useRef<number | null>(null);
  const lastTargetRef = useRef<Position | null>(null);

  const animate = useCallback(() => {
    if (!targetPosition) {
      setIsMoving(false);
      return;
    }

    const dx = targetPosition.x - currentPosition.x;
    const dy = targetPosition.y - currentPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < REACHED_THRESHOLD) {
      setCurrentPosition(targetPosition);
      setIsMoving(false);
      onReachTarget?.();
      return;
    }

    setIsMoving(true);
    setDirection(getFacingDirection(dx, dy));

    const newX = currentPosition.x + dx * LERP_FACTOR;
    const newY = currentPosition.y + dy * LERP_FACTOR;

    setCurrentPosition({ x: newX, y: newY });
    animationRef.current = requestAnimationFrame(animate);
  }, [currentPosition, targetPosition, onReachTarget]);

  useEffect(() => {
    if (!enabled) {
      setCurrentPosition(position);
      return;
    }

    if (
      targetPosition &&
      (lastTargetRef.current?.x !== targetPosition.x ||
        lastTargetRef.current?.y !== targetPosition.y)
    ) {
      lastTargetRef.current = targetPosition;
      setIsMoving(true);
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, targetPosition, position, animate]);

  useEffect(() => {
    if (!enabled) {
      setCurrentPosition(position);
    }
  }, [enabled, position]);

  return { currentPosition, isMoving, direction };
}

export default useCharacterMovement;
