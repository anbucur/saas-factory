interface NameLabelProps {
  name: string;
  role: string;
  isActive?: boolean;
}

export function NameLabel({ name, role, isActive = false }: NameLabelProps) {
  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        top: -24,
        left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        className={`
          px-1.5 py-0.5 rounded text-[9px] font-semibold
          ${isActive
            ? 'bg-cyan-500/90 text-white shadow-lg shadow-cyan-500/30'
            : 'bg-zinc-800/90 text-zinc-300'
          }
        `}
        style={{
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        <span className={isActive ? 'text-white' : 'text-zinc-300'}>
          {name}
        </span>
        <span className="text-zinc-500 ml-1">{role}</span>
      </div>
    </div>
  );
}

export default NameLabel;
