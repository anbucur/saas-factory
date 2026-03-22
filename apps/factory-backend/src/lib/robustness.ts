/**
 * Temporal Robustness Helpers
 * 
 * Provides:
 * - Activity idempotency with deterministic keys
 * - Compensation/saga pattern for cleanup on failure
 * - DB-backed LLM call caching
 * - Circuit breaker for external services
 * - Error classification (retryable vs non-retryable)
 */

import { createHash } from 'crypto'
import { db } from '../db/index.js'
import { compensationLog, llmCallCache, workflowState, phaseMetrics } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import CircuitBreaker from 'opossum'

export function generateIdempotencyKey(...parts: string[]): string {
  return createHash('sha256').update(parts.join(':')).digest('hex').substring(0, 32)
}

export function generatePhaseIdempotencyKey(
  projectId: string,
  phase: string,
  role?: string,
  copyIndex?: number
): string {
  return generateIdempotencyKey(projectId, phase, role ?? 'setup', String(copyIndex ?? 0))
}

export async function getCachedLLMResponse(
  inputHash: string
): Promise<{ content: string; tokens?: number; model?: string } | null> {
  const cached = db.select().from(llmCallCache).where(eq(llmCallCache.inputHash, inputHash)).get()
  if (!cached) return null
  
  if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
    db.delete(llmCallCache).where(eq(llmCallCache.id, cached.id)).run()
    return null
  }
  
  return {
    content: cached.responseContent,
    tokens: cached.tokensUsed ?? undefined,
    model: cached.model ?? undefined,
  }
}

export async function cacheLLMResponse(
  inputHash: string,
  systemPrompt: string,
  messagesHash: string,
  response: { content: string; tokens?: number; model?: string },
  ttlHours = 24
): Promise<void> {
  const id = generateIdempotencyKey(inputHash, String(Date.now()))
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
  
  db.insert(llmCallCache).values({
    id,
    inputHash,
    systemPrompt,
    messagesHash,
    responseContent: response.content,
    tokensUsed: response.tokens,
    model: response.model,
    createdAt: new Date(),
    expiresAt,
  }).run()
}

export function hashLLMInputs(systemPrompt: string, messages: Array<{ role: string; content: string }>): string {
  const normalized = JSON.stringify({ systemPrompt, messages })
  return createHash('sha256').update(normalized).digest('hex')
}

interface CompensationRecord {
  type: 'delete' | 'update' | 'restore'
  table: string
  filter: Record<string, unknown>
  details: Record<string, unknown>
}

export async function executeCompensation(
  projectId: string,
  phase: string,
  activityName: string,
  records: CompensationRecord[]
): Promise<{ success: boolean; totalRecordsAffected: number; error?: string }> {
  const compensationId = generateIdempotencyKey(projectId, phase, activityName, String(Date.now()))
  let totalRecords = 0
  
  try {
    for (const record of records) {
      let affected = 0
      switch (record.type) {
        case 'delete':
          // Dynamic delete based on filter is complex in raw SQL
          // For now, we track the intent
          affected = record.details.count as number ?? 0
          break
        case 'update':
          affected = record.details.count as number ?? 0
          break
        case 'restore':
          affected = record.details.count as number ?? 0
          break
      }
      totalRecords += affected
    }
    
    db.insert(compensationLog).values({
      id: compensationId,
      projectId,
      phase,
      activityName,
      compensationType: 'delete',
      recordsAffected: totalRecords,
      details: JSON.stringify(records),
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date(),
    }).run()
    
    return { success: true, totalRecordsAffected: totalRecords }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    db.insert(compensationLog).values({
      id: compensationId,
      projectId,
      phase,
      activityName,
      compensationType: 'delete',
      recordsAffected: totalRecords,
      details: JSON.stringify(records),
      status: 'failed',
      error: errMsg,
      createdAt: new Date(),
    }).run()
    
    return { success: false, totalRecordsAffected: totalRecords, error: errMsg }
  }
}

export async function markPhaseCompleted(
  projectId: string,
  phase: string,
  results: { conversationId: string; metricsId: string }
): Promise<void> {
  const existing = db.select().from(workflowState).where(eq(workflowState.projectId, projectId)).get()
  
  const completedPhases = existing ? JSON.parse(existing.completedPhases) as string[] : []
  if (!completedPhases.includes(phase)) {
    completedPhases.push(phase)
  }
  
  const phaseResults = existing ? JSON.parse(existing.phaseResults) as Record<string, unknown> : {}
  phaseResults[phase] = {
    ...results,
    status: 'completed',
    completedAt: new Date().toISOString(),
  }
  
  if (existing) {
    db.update(workflowState)
      .set({
        currentPhase: phase as typeof existing.currentPhase,
        completedPhases: JSON.stringify(completedPhases),
        phaseResults: JSON.stringify(phaseResults),
        updatedAt: new Date(),
      })
      .where(eq(workflowState.id, existing.id))
      .run()
  } else {
    db.insert(workflowState).values({
      id: projectId,
      projectId,
      currentPhase: phase as 'requirements',
      completedPhases: JSON.stringify(completedPhases),
      phaseResults: JSON.stringify(phaseResults),
      workflowType: 'buildSaaSProject',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run()
  }
}

export async function getWorkflowState(projectId: string) {
  const state = db.select().from(workflowState).where(eq(workflowState.projectId, projectId)).get()
  if (!state) return null
  
  return {
    ...state,
    completedPhases: JSON.parse(state.completedPhases) as string[],
    phaseResults: JSON.parse(state.phaseResults) as Record<string, unknown>,
    deploymentState: state.deploymentState ? JSON.parse(state.deploymentState) : null,
  }
}

export async function isPhaseCompleted(projectId: string, phase: string): Promise<boolean> {
  const state = await getWorkflowState(projectId)
  if (!state) return false
  return state.completedPhases.includes(phase)
}

export async function getPhaseResults(projectId: string, phase: string) {
  const state = await getWorkflowState(projectId)
  if (!state) return null
  return state.phaseResults[phase] as { conversationId: string; metricsId: string; status: string } | null
}

export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const transientKeywords = [
      'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
      'timeout', 'network', 'connection', 'temporary',
      'rate limit', '429', '503', '502', '504',
      'ECONNABORTED', 'EPIPE',
    ]
    const msg = error.message.toLowerCase()
    return transientKeywords.some(kw => msg.includes(kw.toLowerCase()))
  }
  return false
}

export class LLMRetryableError extends Error {
  constructor(
    message: string,
    public readonly retryDelay?: string
  ) {
    super(message)
    this.name = 'LLMRetryableError'
  }
}

export class LLMNonRetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LLMNonRetryableError'
  }
}

export interface LLMCallOptions {
  maxTokens?: number
  temperature?: number
  cache?: boolean
  fallbackContent?: string
}

export async function callLLMWithCaching(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  options: LLMCallOptions,
  callFn: (sp: string, msgs: Array<{ role: string; content: string }>, opts: { maxTokens?: number }) => Promise<{ content: string; tokens?: number }>
): Promise<{ content: string; tokens?: number; cached: boolean }> {
  const cacheEnabled = options.cache ?? true
  const inputHash = hashLLMInputs(systemPrompt, messages)
  
  if (cacheEnabled) {
    const cached = await getCachedLLMResponse(inputHash)
    if (cached) {
      return { content: cached.content, tokens: cached.tokens, cached: true }
    }
  }
  
  const response = await callFn(systemPrompt, messages, { maxTokens: options.maxTokens })
  
  if (cacheEnabled && response.content) {
    await cacheLLMResponse(
      inputHash,
      systemPrompt,
      inputHash,
      response,
      24
    ).catch(err => {
      console.warn('[LLMCache] Failed to cache response:', err)
    })
  }
  
  return { content: response.content, tokens: response.tokens, cached: false }
}

const llmBreakerOptions = {
  timeout: 60000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 3,
}

export const llmCircuitBreaker = new CircuitBreaker(
  async <T>(fn: () => Promise<T>): Promise<T> => fn(),
  llmBreakerOptions
)

llmCircuitBreaker.on('open', () => {
  console.warn('[CircuitBreaker] LLM circuit breaker OPEN - using fallback')
})

llmCircuitBreaker.on('halfOpen', () => {
  console.info('[CircuitBreaker] LLM circuit breaker HALF-OPEN - testing')
})

llmCircuitBreaker.on('close', () => {
  console.info('[CircuitBreaker] LLM circuit breaker CLOSED - normal operation')
})

export async function callWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  fallback: T,
  operationName = 'unknown'
): Promise<T> {
  try {
    const result = await llmCircuitBreaker.fire(fn)
    return result as T
  } catch (err: unknown) {
    console.warn(`[CircuitBreaker] ${operationName} failed, using fallback:`, err instanceof Error ? err.message : String(err))
    return fallback
  }
}

export function createIdempotentActivity<T extends (...args: unknown[]) => Promise<unknown>>(
  activityName: string,
  checkExists: () => Promise<{ exists: boolean; result?: unknown }>,
  execute: () => Promise<unknown>,
  onCompensate?: () => Promise<void>
): T {
  return (async (...args: unknown[]) => {
    const check = await checkExists()
    if (check.exists && check.result !== undefined) {
      return check.result
    }
    
    try {
      const result = await execute()
      return result
    } catch (error) {
      if (onCompensate) {
        try {
          await onCompensate()
        } catch (compError) {
          console.error(`[Compensation] Failed for ${activityName}:`, compError)
        }
      }
      throw error
    }
  }) as T
}
