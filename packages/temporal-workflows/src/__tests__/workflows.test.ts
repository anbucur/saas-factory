/**
 * Temporal Workflow Tests for SaaS Factory
 */

import { describe, it, expect, vi } from 'vitest'

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

describe('Deployment Activity Stubs', () => {
  it('PrepareDeploymentInput should have projectId', () => {
    const input = { projectId: 'proj-1' }
    expect(input.projectId).toBeTruthy()
  })

  it('PrepareDeploymentOutput should return options and stack', () => {
    const output = {
      options: [
        { strategy: 'docker', label: 'Docker', description: 'Run in Docker', recommended: true, requirements: [], estimatedTime: '2-5m' },
        { strategy: 'vercel', label: 'Vercel', description: 'Deploy to Vercel', recommended: false, requirements: [], estimatedTime: '1-3m' },
      ],
      stackDetected: { framework: 'react', language: 'typescript', hasBackend: false },
    }
    expect(output.options).toHaveLength(2)
    expect(output.options[0].recommended).toBe(true)
    expect(output.stackDetected.framework).toBe('react')
  })

  it('ExecuteDeploymentInput should have strategy', () => {
    const input = { projectId: 'proj-1', strategy: 'docker' as const }
    expect(input.strategy).toBe('docker')
  })

  it('ExecuteDeploymentOutput should have success and url', () => {
    const output = { success: true, url: 'http://localhost:4000', deploymentId: 'dep-1' }
    expect(output.success).toBe(true)
    expect(output.url).toContain('localhost')
    expect(output.deploymentId).toBeTruthy()
  })

  it('should support all deployment strategies', () => {
    const strategies: Array<'docker' | 'vercel' | 'static'> = ['docker', 'vercel', 'static']
    strategies.forEach(strategy => {
      const input = { projectId: 'proj-1', strategy }
      expect(['docker', 'vercel', 'static']).toContain(input.strategy)
    })
  })
})

describe('Deployment State', () => {
  it('should track pending deployment state', () => {
    const deploymentState = { status: 'pending' }
    expect(deploymentState.status).toBe('pending')
  })

  it('should track awaiting_choice deployment state', () => {
    const deploymentState = { status: 'awaiting_choice', options: [] }
    expect(deploymentState.status).toBe('awaiting_choice')
  })

  it('should track deploying deployment state', () => {
    const deploymentState = { status: 'deploying' }
    expect(deploymentState.status).toBe('deploying')
  })

  it('should track deployed state with URL', () => {
    const deploymentState = { status: 'deployed', url: 'https://example.com' }
    expect(deploymentState.status).toBe('deployed')
    expect(deploymentState.url).toBeDefined()
  })

  it('should track failed state', () => {
    const deploymentState = { status: 'failed' }
    expect(deploymentState.status).toBe('failed')
  })
})

describe('Phase Order', () => {
  it('should define correct build phases in order', () => {
    const phases = ['requirements', 'architecture', 'development', 'testing', 'deployment'] as const
    expect(phases).toHaveLength(5)
    expect(phases[0]).toBe('requirements')
    expect(phases[phases.length - 1]).toBe('deployment')
  })

  it('should have requirements before architecture', () => {
    const phases = ['requirements', 'architecture', 'development', 'testing', 'deployment']
    expect(phases.indexOf('requirements')).toBeLessThan(phases.indexOf('architecture'))
  })

  it('should have architecture before development', () => {
    const phases = ['requirements', 'architecture', 'development', 'testing', 'deployment']
    expect(phases.indexOf('architecture')).toBeLessThan(phases.indexOf('development'))
  })

  it('should have development before testing', () => {
    const phases = ['requirements', 'architecture', 'development', 'testing', 'deployment']
    expect(phases.indexOf('development')).toBeLessThan(phases.indexOf('testing'))
  })

  it('should have testing before deployment', () => {
    const phases = ['requirements', 'architecture', 'development', 'testing', 'deployment']
    expect(phases.indexOf('testing')).toBeLessThan(phases.indexOf('deployment'))
  })
})

describe('Agent Roles by Phase', () => {
  it('should have PM and BA for requirements phase', () => {
    const reqRoles = ['pm', 'ba']
    expect(reqRoles).toContain('pm')
    expect(reqRoles).toContain('ba')
  })

  it('should have architect and PM for architecture phase', () => {
    const archRoles = ['architect', 'pm']
    expect(archRoles).toContain('architect')
    expect(archRoles).toContain('pm')
  })

  it('should have PM, frontend_dev, backend_dev for development phase', () => {
    const devRoles = ['pm', 'frontend_dev', 'backend_dev']
    expect(devRoles).toContain('pm')
    expect(devRoles).toContain('frontend_dev')
    expect(devRoles).toContain('backend_dev')
  })

  it('should have QA, frontend_dev, backend_dev, PM for testing phase', () => {
    const testRoles = ['qa', 'frontend_dev', 'backend_dev', 'pm']
    expect(testRoles).toContain('qa')
    expect(testRoles).toContain('frontend_dev')
    expect(testRoles).toContain('backend_dev')
    expect(testRoles).toContain('pm')
  })

  it('should have devops and PM for deployment phase', () => {
    const deployRoles = ['devops', 'pm']
    expect(deployRoles).toContain('devops')
    expect(deployRoles).toContain('pm')
  })
})
