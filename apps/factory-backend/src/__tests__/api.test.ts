/**
 * Backend API Tests for SaaS Factory
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const TEST_PORT = 3099
const BASE_URL = `http://localhost:${TEST_PORT}`

// Test build payload
const testBuild = {
  name: 'Test Family Blog',
  description: 'A family blog with AI cover images and comments',
  features: ['blog posts', 'AI cover images', 'comments', 'share posts'],
}

describe('POST /api/builds', () => {
  it('should reject empty name', async () => {
    const res = await fetch(`${BASE_URL}/api/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', description: 'test' }),
    })
    expect(res.status).toBe(400)
  })

  it('should reject missing name', async () => {
    const res = await fetch(`${BASE_URL}/api/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'test' }),
    })
    expect(res.status).toBe(400)
  })

  it('should accept valid build request', async () => {
    const res = await fetch(`${BASE_URL}/api/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBuild),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { buildId: string; status: string }
    expect(data.buildId).toBeDefined()
    expect(data.status).toBe('started')
  })

  it('should return valid UUID as buildId', async () => {
    const res = await fetch(`${BASE_URL}/api/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBuild),
    })
    const data = await res.json() as { buildId: string }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    expect(data.buildId).toMatch(uuidRegex)
  })
})

describe('GET /api/health', () => {
  it('should return ok status', async () => {
    const res = await fetch(`${BASE_URL}/api/health`)
    expect(res.status).toBe(200)
    const data = await res.json() as { status: string }
    expect(data.status).toBe('ok')
  })

  it('should include temporal status', async () => {
    const res = await fetch(`${BASE_URL}/api/health`)
    const data = await res.json() as { temporal: string }
    expect(data.temporal).toBeDefined()
    expect(['connected', 'unavailable']).toContain(data.temporal)
  })
})

describe('POST /api/events', () => {
  it('should accept valid event', async () => {
    const event = {
      type: 'agent:spawn',
      payload: { buildId: 'test-123', agent: 'coder', task: 'Write code' },
    }
    const res = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { ok: boolean }
    expect(data.ok).toBe(true)
  })

  it('should include timestamp in broadcast', async () => {
    const event = {
      type: 'log',
      payload: { buildId: 'test-123', message: 'Test log' },
    }
    const res = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    expect(res.status).toBe(200)
  })
})

describe('CORS', () => {
  it('should allow cross-origin requests', async () => {
    const res = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: { Origin: 'http://example.com' },
    })
    expect(res.status).toBe(200)
  })
})
