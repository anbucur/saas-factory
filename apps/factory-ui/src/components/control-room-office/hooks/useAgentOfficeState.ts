import type { Agent } from '../../../types';
import type { Position } from '../data/layoutPositions';
import { getDeskPosition, getCafeteriaPosition, getMeetingRoomPosition } from '../data/layoutPositions';

export type AgentLocationType = 'cafeteria' | 'desk' | 'meeting_room' | 'walking';

export interface AgentOfficeState {
  location: AgentLocationType;
  targetPosition: Position | null;
  animationStatus: string;
  meetingRoomId?: string;
}

export function useAgentOfficeState(
  agent: Agent,
  agentIndex: number,
  meetingRoomId?: string
): AgentOfficeState {
  const { status, id, role } = agent;

  switch (status) {
    case 'idle':
      return {
        location: 'cafeteria',
        targetPosition: getCafeteriaPosition(id, agentIndex),
        animationStatus: 'idle',
      };

    case 'thinking':
      return {
        location: 'desk',
        targetPosition: getDeskPosition(id, role, agentIndex),
        animationStatus: 'thinking',
      };

    case 'working':
    case 'reviewing':
      return {
        location: 'desk',
        targetPosition: getDeskPosition(id, role, agentIndex),
        animationStatus: status,
      };

    case 'blocked':
      return {
        location: 'desk',
        targetPosition: getDeskPosition(id, role, agentIndex),
        animationStatus: 'blocked',
      };

    case 'done':
      if (meetingRoomId) {
        return {
          location: 'meeting_room',
          targetPosition: getMeetingRoomPosition(meetingRoomId),
          animationStatus: 'meeting',
          meetingRoomId,
        };
      }
      return {
        location: 'cafeteria',
        targetPosition: getCafeteriaPosition(id, agentIndex),
        animationStatus: 'idle',
      };

    default:
      return {
        location: 'cafeteria',
        targetPosition: getCafeteriaPosition(id, agentIndex),
        animationStatus: 'idle',
      };
  }
}

export function getMeetingRoomForPhase(
  phase: string,
  conversationId?: string
): string | undefined {
  if (!conversationId) return undefined;

  switch (phase) {
    case 'requirements':
      return 'meeting-1';
    case 'architecture':
      return 'meeting-2';
    case 'development':
    case 'testing':
    case 'deployment':
      return 'meeting-3';
    default:
      return undefined;
  }
}

export default useAgentOfficeState;
