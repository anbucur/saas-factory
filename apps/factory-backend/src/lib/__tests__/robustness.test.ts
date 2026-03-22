/**
 * Robustness Helpers Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  generateIdempotencyKey,
  generatePhaseIdempotencyKey,
  isTransientError,
  LLMRetryableError,
  LLMNonRetryableError,
  hashLLMInputs,
} from '../robustness'

describe('Idempotency Keys', () => {
  it('should generate consistent keys for same inputs', () => {
    const key1 = generateIdempotencyKey('project1', 'requirements', 'pm', '0')
    const key2 = generateIdempotencyKey('project1', 'requirements', 'pm', '0')
    expect(key1).toBe(key2)
  })

  it('should generate different keys for different inputs', () => {
    const key1 = generateIdempotencyKey('project1', 'requirements', 'pm', '0')
    const key2 = generateIdempotencyKey('project1', 'requirements', 'pm', '1')
    expect(key1).not.toBe(key2)
  })

  it('should generate phase-specific idempotency keys', () => {
    const key = generatePhaseIdempotencyKey('project1', 'development', 'frontend_dev', 0)
    expect(key).toBeDefined()
    expect(key.length).toBe(32) // SHA-256 truncated to 32 chars
  })

  it('should handle missing optional parameters', () => {
    const key = generatePhaseIdempotencyKey('project1', 'architecture', undefined, undefined)
    expect(key).toBeDefined()
    expect(key.length).toBe(32)
  })
})

describe('LLM Input Hashing', () => {
  it('should generate consistent hash for same inputs', () => {
    const hash1 = hashLLMInputs('system prompt', [{ role: 'user', content: 'hello' }])
    const hash2 = hashLLMInputs('system prompt', [{ role: 'user', content: 'hello' }])
    expect(hash1).toBe(hash2)
  })

  it('should generate different hash for different inputs', () => {
    const hash1 = hashLLMInputs('system prompt', [{ role: 'user', content: 'hello' }])
    const hash2 = hashLLMInputs('system prompt', [{ role: 'user', content: 'world' }])
    expect(hash1).not.toBe(hash2)
  })

  it('should generate different hash for different system prompts', () => {
    const hash1 = hashLLMInputs('prompt A', [{ role: 'user', content: 'hello' }])
    const hash2 = hashLLMInputs('prompt B', [{ role: 'user', content: 'hello' }])
    expect(hash1).not.toBe(hash2)
  })
})

describe('Error Classification', () => {
  describe('isTransientError', () => {
    it('should identify connection refused as transient', () => {
      expect(isTransientError(new Error('ECONNREFUSED'))).toBe(true)
    })

    it('should identify timeout errors as transient', () => {
      expect(isTransientError(new Error('Request timeout'))).toBe(true)
    })

    it('should identify network errors as transient', () => {
      expect(isTransientError(new Error('Network error'))).toBe(true)
    })

    it('should identify rate limit errors as transient', () => {
      expect(isTransientError(new Error('Rate limit exceeded (429)'))).toBe(true)
    })

    it('should identify permanent errors as non-transient', () => {
      expect(isTransientError(new Error('Invalid project ID'))).toBe(false)
    })

    it('should handle non-Error inputs', () => {
      expect(isTransientError('string error')).toBe(false)
      expect(isTransientError(null)).toBe(false)
      expect(isTransientError(undefined)).toBe(false)
    })
  })

  describe('LLMRetryableError', () => {
    it('should create retryable error with message', () => {
      const error = new LLMRetryableError('Temporary failure')
      expect(error.message).toBe('Temporary failure')
      expect(error.name).toBe('LLMRetryableError')
      expect(error.retryDelay).toBeUndefined()
    })

    it('should create retryable error with retry delay', () => {
      const error = new LLMRetryableError('Temporary failure', '10s')
      expect(error.message).toBe('Temporary failure')
      expect(error.retryDelay).toBe('10s')
    })
  })

  describe('LLMNonRetryableError', () => {
    it('should create non-retryable error', () => {
      const error = new LLMNonRetryableError('Invalid configuration')
      expect(error.message).toBe('Invalid configuration')
      expect(error.name).toBe('LLMNonRetryableError')
    })
  })
})
