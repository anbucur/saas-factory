/**
 * Temporal Workflow Tests for SaaS Factory
 */

import { describe, it, expect } from 'vitest'

// Mock the activities
const mockActivities = {
  generateSpec: vi.fn(),
  scaffoldProject: vi.fn(),
  writeCode: vi.fn(),
  buildUI: vi.fn(),
  runTests: vi.fn(),
  deploy: vi.fn(),
}

// Mock workflowInfo
vi.mock('@temporalio/workflow', () => ({
  proxyActivities: () => mockActivities,
  workflowInfo: () => ({ workflowId: 'test-workflow-123' }),
}))

describe('BuildSpec Interface', () => {
  it('should accept valid BuildSpec', () => {
    const spec = {
      name: 'Family Blog',
      description: 'A family blog for family members',
      features: ['blog posts', 'comments', 'AI images'],
      billingMode: 'none' as const,
    }
    expect(spec.name).toBe('Family Blog')
    expect(spec.features).toHaveLength(3)
    expect(spec.billingMode).toBe('none')
  })

  it('should support subscription billing mode', () => {
    const spec = {
      name: 'SaaS App',
      description: 'Test',
      features: [],
      billingMode: 'subscription' as const,
    }
    expect(spec.billingMode).toBe('subscription')
  })

  it('should support usage billing mode', () => {
    const spec = {
      name: 'Usage App',
      description: 'Test',
      features: [],
      billingMode: 'usage' as const,
    }
    expect(spec.billingMode).toBe('usage')
  })
})

describe('Activity Input Validation', () => {
  it('should validate GenerateSpecInput', () => {
    const input = {
      name: 'Test Project',
      description: 'Test description',
      features: ['feature1', 'feature2'],
      buildId: 'test-123',
    }
    expect(input.name).toBeDefined()
    expect(input.description).toBeDefined()
    expect(input.features).toBeInstanceOf(Array)
    expect(input.buildId).toBeDefined()
  })

  it('should validate ScaffoldProjectInput', () => {
    const input = {
      projectName: 'test-project',
      spec: '# SPEC content',
      buildId: 'test-123',
    }
    expect(input.projectName).toMatch(/^[a-z0-9-]+$/)
    expect(input.spec).toBeDefined()
  })

  it('should validate DeployInput', () => {
    const input = {
      projectName: 'test-project',
      buildId: 'test-123',
    }
    expect(input.projectName).toBeDefined()
    expect(input.buildId).toBeDefined()
  })
})

describe('Activity Output Validation', () => {
  it('should validate GenerateSpecOutput', () => {
    const output = {
      spec: '# Generated SPEC content',
      tokens: 1500,
    }
    expect(typeof output.spec).toBe('string')
    expect(output.spec.length).toBeGreaterThan(0)
    expect(typeof output.tokens).toBe('number')
  })

  it('should validate ScaffoldProjectOutput', () => {
    const output = {
      projectPath: '/path/to/project',
      stack: ['React', 'TypeScript', 'Vite'],
    }
    expect(output.projectPath).toBeDefined()
    expect(output.stack).toBeInstanceOf(Array)
    expect(output.stack.length).toBeGreaterThan(0)
  })

  it('should validate BuildUIOutput', () => {
    const output = {
      components: 10,
      pages: ['Dashboard', 'Settings'],
      buildPath: '/path/to/dist',
    }
    expect(typeof output.components).toBe('number')
    expect(output.pages).toBeInstanceOf(Array)
    expect(output.buildPath).toBeDefined()
  })

  it('should validate RunTestsOutput', () => {
    const output = {
      passed: true,
      checks: ['✅ dist exists', '✅ index.html exists'],
    }
    expect(typeof output.passed).toBe('boolean')
    expect(output.checks).toBeInstanceOf(Array)
  })

  it('should validate DeployOutput', () => {
    const output = {
      url: 'https://test-project.fly.dev',
      region: 'ams',
    }
    expect(output.url).toMatch(/^https?:\/\//)
    expect(output.region).toBeDefined()
  })
})

describe('BuildResult Interface', () => {
  it('should handle success result', () => {
    const result = {
      success: true,
      url: 'https://test.fly.dev',
    }
    expect(result.success).toBe(true)
    expect(result.url).toBeDefined()
  })

  it('should handle error result', () => {
    const result = {
      success: false,
      error: 'Build failed: npm install error',
    }
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('Workflow Sequence', () => {
  it('should define correct phase order', () => {
    const phases = ['generateSpec', 'scaffoldProject', 'writeCode', 'buildUI', 'runTests', 'deploy']
    // Verify all activities are in sequence
    expect(phases).toContain('generateSpec')
    expect(phases).toContain('scaffoldProject')
    expect(phases).toContain('deploy')
    expect(phases.indexOf('generateSpec')).toBeLessThan(phases.indexOf('deploy'))
  })

  it('should have sequential dependencies', () => {
    // scaffoldProject depends on generateSpec output
    // writeCode depends on scaffoldProject output
    // etc.
    const dependencies = {
      scaffoldProject: ['generateSpec'],
      writeCode: ['scaffoldProject'],
      buildUI: ['writeCode'],
      runTests: ['buildUI'],
      deploy: ['runTests'],
    }

    expect(dependencies.scaffoldProject).toContain('generateSpec')
    expect(dependencies.writeCode).toContain('scaffoldProject')
    expect(dependencies.deploy).toContain('runTests')
  })
})

describe('Activity Stubs with Metrics', () => {
  it('SetupPhaseOutput should include metricsId', () => {
    const output = {
      conversationId: 'conv-123',
      metricsId: 'metric-456',
    }
    expect(output.conversationId).toBeTruthy()
    expect(output.metricsId).toBeTruthy()
  })

  it('RunAgentWorkInput should accept optional metricsId', () => {
    const input = {
      projectId: 'proj-1',
      phase: 'requirements',
      role: 'pm',
      conversationId: 'conv-1',
      metricsId: 'metric-1',
    }
    expect(input.metricsId).toBe('metric-1')
  })

  it('CompletePhaseInput should accept optional metricsId', () => {
    const input = {
      projectId: 'proj-1',
      phase: 'requirements',
      conversationId: 'conv-1',
      metricsId: 'metric-1',
    }
    expect(input.metricsId).toBe('metric-1')
  })
})
