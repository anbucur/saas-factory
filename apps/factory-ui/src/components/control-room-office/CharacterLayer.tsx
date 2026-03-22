import { useMemo } from 'react';
import { useAppStore } from '../../store/store';
import { PixelCharacter } from './PixelCharacter';
import { useAgentOfficeState, getMeetingRoomForPhase } from './hooks/useAgentOfficeState';
import { getDeskPosition } from './data/layoutPositions';
import type { Agent } from '../../types';

interface CharacterLayerProps {
  className?: string;
}

function AgentCharacter({ agent, agentIndex }: { agent: Agent; agentIndex: number }) {
  const currentPhase = useAppStore((s) => s.currentProject?.currentPhase);
  const conversations = useAppStore((s) => s.currentProject?.conversations || []);

  const meetingRoomId = useMemo(() => {
    if (currentPhase && agent.status === 'done') {
      const activeConvo = conversations.find(
        (c) => c.status === 'active' && c.phase === currentPhase
      );
      return getMeetingRoomForPhase(currentPhase, activeConvo?.id);
    }
    return undefined;
  }, [currentPhase, conversations, agent.status]);

  const { targetPosition, animationStatus } = useAgentOfficeState(
    agent,
    agentIndex,
    meetingRoomId
  );

  const deskPosition = getDeskPosition(agent.id, agent.role, agentIndex);

  const displayPosition = targetPosition || deskPosition;

  const isWorkingAtDesk =
    agent.status === 'working' ||
    agent.status === 'reviewing' ||
    agent.status === 'thinking';

  return (
    <PixelCharacter
      agentId={agent.id}
      name={agent.name}
      role={agent.role}
      status={isWorkingAtDesk ? agent.status : animationStatus}
      position={deskPosition}
      targetPosition={displayPosition}
      size={64}
    />
  );
}

export function CharacterLayer({ className }: CharacterLayerProps) {
  const agents = useAppStore((s) => s.currentProject?.agents || []);

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      const roleOrder: Record<string, number> = {
        pm: 0,
        ba: 1,
        architect: 2,
        frontend_dev: 3,
        backend_dev: 4,
        ux_designer: 5,
        qa: 6,
        devops: 7,
      };
      return (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
    });
  }, [agents]);

  return (
    <div className={className}>
      {sortedAgents.map((agent, index) => (
        <AgentCharacter key={agent.id} agent={agent} agentIndex={index} />
      ))}
    </div>
  );
}

export default CharacterLayer;
