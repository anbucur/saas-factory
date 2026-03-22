import { useState, useCallback, useRef } from 'react';
import type { Position } from '../data/layoutPositions';
import { PM_DESK_DELIVERY_ZONE } from '../data/layoutPositions';

interface DeliveryState {
  isDelivering: boolean;
  agentId: string | null;
  artifactId: string | null;
}

interface UseDeliveryAnimationResult {
  deliveryState: DeliveryState;
  startDelivery: (agentId: string, artifactId: string, fromPosition: Position) => void;
  completeDelivery: () => void;
  cancelDelivery: () => void;
}

export function useDeliveryAnimation(
  onDeliver?: (agentId: string, artifactId: string) => void
): UseDeliveryAnimationResult {
  const [deliveryState, setDeliveryState] = useState<DeliveryState>({
    isDelivering: false,
    agentId: null,
    artifactId: null,
  });
  const deliveryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startDelivery = useCallback(
    (agentId: string, artifactId: string, _fromPosition: Position) => {
      if (deliveryTimerRef.current) {
        clearTimeout(deliveryTimerRef.current);
      }

      setDeliveryState({
        isDelivering: true,
        agentId,
        artifactId,
      });

      deliveryTimerRef.current = setTimeout(() => {
        onDeliver?.(agentId, artifactId);
        setDeliveryState({
          isDelivering: false,
          agentId: null,
          artifactId: null,
        });
      }, 2000);
    },
    [onDeliver]
  );

  const completeDelivery = useCallback(() => {
    if (deliveryTimerRef.current) {
      clearTimeout(deliveryTimerRef.current);
    }
    setDeliveryState({
      isDelivering: false,
      agentId: null,
      artifactId: null,
    });
  }, []);

  const cancelDelivery = useCallback(() => {
    if (deliveryTimerRef.current) {
      clearTimeout(deliveryTimerRef.current);
    }
    setDeliveryState({
      isDelivering: false,
      agentId: null,
      artifactId: null,
    });
  }, []);

  return {
    deliveryState,
    startDelivery,
    completeDelivery,
    cancelDelivery,
  };
}

export function getDeliveryPosition(): Position {
  return PM_DESK_DELIVERY_ZONE;
}

export default useDeliveryAnimation;
