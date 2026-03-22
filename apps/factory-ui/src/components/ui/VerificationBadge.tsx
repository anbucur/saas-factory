import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import type { TaskStatus } from '../../types'

interface VerificationBadgeProps {
  score: number | null
  status: TaskStatus
  compact?: boolean
}

const VERIFICATION_PASSING_SCORE = 80

export function VerificationBadge({ score, status, compact = false }: VerificationBadgeProps) {
  if (status === 'revision_requested') {
    return (
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        <AlertTriangle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        {!compact && <span>Needs Revision</span>}
        {compact && score !== null && <span>{score}</span>}
      </div>
    )
  }

  if (status === 'pending_approval') {
    return (
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        <AlertCircle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        {!compact && <span>Pending Approval</span>}
      </div>
    )
  }

  if (score === null) {
    return null
  }

  if (score >= VERIFICATION_PASSING_SCORE) {
    return (
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        <CheckCircle2 className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        {!compact && <span>Verified</span>}
        {compact && <span>{score}</span>}
      </div>
    )
  }

  if (score >= 60) {
    return (
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        <AlertCircle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        {!compact && <span>Partial ({score})</span>}
        {compact && <span>{score}</span>}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <AlertTriangle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
      {!compact && <span>Failed ({score})</span>}
      {compact && <span>{score}</span>}
    </div>
  )
}

interface ComplexityBadgeProps {
  complexity: 'low' | 'medium' | 'high' | 'critical'
}

export function ComplexityBadge({ complexity }: ComplexityBadgeProps) {
  const colors = {
    low: 'bg-zinc-500/20 text-zinc-400',
    medium: 'bg-blue-500/20 text-blue-400',
    high: 'bg-amber-500/20 text-amber-400',
    critical: 'bg-red-500/20 text-red-400',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${colors[complexity]}`}>
      {complexity.toUpperCase()}
    </span>
  )
}
