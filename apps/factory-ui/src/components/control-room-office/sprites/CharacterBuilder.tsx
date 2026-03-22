import type { AgentRole } from '../../../types';
import { CHARACTER_PALETTE } from './CharacterPalette';

interface CharacterBuilderProps {
  role: AgentRole;
  frame: number;
  animationState: string;
  size?: number;
  hairColor?: string;
  skinTone?: string;
}

const PIXEL = 4;

function PixelRect({
  x,
  y,
  width,
  height,
  fill,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}) {
  return (
    <rect
      x={x * PIXEL}
      y={y * PIXEL}
      width={width * PIXEL}
      height={height * PIXEL}
      fill={fill}
    />
  );
}

function Eye({
  x,
  y,
  open = true,
}: {
  x: number;
  y: number;
  open?: boolean;
}) {
  const eyeY = open ? y : y + 1;
  const eyeH = open ? 2 : 1;
  return (
    <>
      <PixelRect x={x} y={eyeY} width={2} height={eyeH} fill="#1a1a2e" />
      <PixelRect x={x + 1} y={eyeY} width={1} height={1} fill="#ffffff" />
    </>
  );
}

function BlinkingEyes({ x, y, frame }: { x: number; y: number; frame: number }) {
  const isBlink = frame === 2 || frame === 3;
  return (
    <>
      <Eye x={x} y={y} open={!isBlink} />
      <Eye x={x + 4} y={y} open={!isBlink} />
    </>
  );
}

function RosyCheeks({ x, y }: { x: number; y: number }) {
  return (
    <>
      <PixelRect x={x} y={y} width={2} height={1} fill="#FFB6C1" />
      <PixelRect x={x + 8} y={y} width={2} height={1} fill="#FFB6C1" />
    </>
  );
}

function CuteMouth({ x, y, frame }: { x: number; y: number; frame: number }) {
  const isHappy = frame === 0 || frame === 1;
  if (isHappy) {
    return (
      <PixelRect x={x + 3} y={y} width={4} height={2} fill="#E91E63" />
    );
  }
  return (
    <>
      <PixelRect x={x + 2} y={y} width={1} height={1} fill="#E91E63" />
      <PixelRect x={x + 5} y={y} width={1} height={1} fill="#E91E63" />
    </>
  );
}

function HairStyle({
  x,
  y,
  color,
  style,
}: {
  x: number;
  y: number;
  color: string;
  style: number;
}) {
  const styles: Record<number, JSX.Element> = {
    0: (
      <>
        <PixelRect x={x} y={y} width={12} height={4} fill={color} />
        <PixelRect x={x - 1} y={y + 1} width={2} height={3} fill={color} />
        <PixelRect x={x + 11} y={y + 1} width={2} height={3} fill={color} />
      </>
    ),
    1: (
      <>
        <PixelRect x={x} y={y} width={12} height={5} fill={color} />
        <PixelRect x={x + 2} y={y + 5} width={3} height={2} fill={color} />
        <PixelRect x={x + 7} y={y + 5} width={3} height={2} fill={color} />
      </>
    ),
    2: (
      <>
        <PixelRect x={x + 1} y={y} width={10} height={3} fill={color} />
        <PixelRect x={x} y={y + 2} width={2} height={4} fill={color} />
        <PixelRect x={x + 10} y={y + 2} width={2} height={4} fill={color} />
        <PixelRect x={x + 4} y={y - 1} width={4} height={2} fill={color} />
      </>
    ),
    3: (
      <>
        <PixelRect x={x} y={y + 1} width={12} height={4} fill={color} />
        <PixelRect x={x + 3} y={y} width={6} height={2} fill={color} />
      </>
    ),
  };
  return styles[style % 4] || styles[0];
}

function Body({
  x,
  y,
  color,
  frame,
  isWorking,
}: {
  x: number;
  y: number;
  color: string;
  frame: number;
  isWorking: boolean;
}) {
  const bounce = frame % 2 === 0 ? 0 : -1;
  return (
    <>
      <PixelRect x={x + 2} y={y + bounce} width={8} height={6} fill={color} />
      <PixelRect x={x + 1} y={y + 1 + bounce} width={2} height={4} fill={color} />
      <PixelRect x={x + 9} y={y + 1 + bounce} width={2} height={4} fill={color} />
      {isWorking && (
        <>
          <PixelRect x={x + 10} y={y + 2} width={2} height={4} fill={color} />
          <PixelRect x={x + 11} y={y + 1} width={1} height={5} fill="#F4C495" />
        </>
      )}
    </>
  );
}

function Legs({
  x,
  y,
  frame,
  isWalking: _isWalking,
}: {
  x: number;
  y: number;
  frame: number;
  isWalking: boolean;
}) {
  const walkOffset = _isWalking ? (frame % 3) - 1 : 0;
  return (
    <>
      <PixelRect x={x + 2 + walkOffset} y={y} width={3} height={3} fill="#374151" />
      <PixelRect x={x + 7 - walkOffset} y={y} width={3} height={3} fill="#374151" />
    </>
  );
}

function CarryingFile({
  x,
  y,
  show,
}: {
  x: number;
  y: number;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <>
      <PixelRect x={x + 11} y={y + 2} width={4} height={5} fill="#FEF3C7" />
      <PixelRect x={x + 12} y={y + 3} width={2} height={1} fill="#D97706" />
    </>
  );
}

export function CharacterBuilder({
  role,
  frame,
  animationState,
  size = 64,
  hairColor,
  skinTone,
}: CharacterBuilderProps) {
  const colors = CHARACTER_PALETTE[role];
  const hair = hairColor || colors.hair;
  const skin = skinTone || colors.skin;
  const shirt = colors.shirt;

  const isWorking = animationState === 'work';
  const isCarrying = animationState === 'deliver';
  const isCelebrating = animationState === 'celebrate';
  const isWalking = animationState.startsWith('walk');

  const hairStyleIndex = role.charCodeAt(0) % 4;
  const bounce = isCelebrating ? -2 : isWalking ? 0 : frame % 2 === 0 ? 0 : -1;

  const viewBoxY = isCelebrating ? -8 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 ${viewBoxY} 64 ${64 - viewBoxY}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}
    >
      <HairStyle x={2} y={6 + bounce} color={hair} style={hairStyleIndex} />

      <PixelRect x={3} y={10 + bounce} width={8} height={7} fill={skin} />
      <PixelRect x={4} y={11 + bounce} width={6} height={5} fill={skin} />

      <BlinkingEyes x={4} y={12 + bounce} frame={frame} />

      <RosyCheeks x={3} y={15 + bounce} />

      <CuteMouth x={4} y={16 + bounce} frame={frame} />

      <Body x={2} y={17 + bounce} color={shirt} frame={frame} isWorking={isWorking} />

      <Legs x={3} y={23 + bounce} frame={frame} isWalking={isWalking} />

      <CarryingFile x={2} y={17 + bounce} show={isCarrying} />

      {isCelebrating && (
        <>
          <PixelRect x={0} y={4} width={2} height={2} fill="#FCD34D" />
          <PixelRect x={14} y={3} width={2} height={2} fill="#FCD34D" />
          <PixelRect x={6} y={2} width={2} height={2} fill="#FCD34D" />
          <PixelRect x={10} y={1} width={2} height={2} fill="#FCD34D" />
        </>
      )}
    </svg>
  );
}

export default CharacterBuilder;
