/**
 * Temporal Activity stubs — type contracts for the buildSaaS workflow.
 * Actual implementations live in apps/factory-backend/src/worker.ts.
 */

// ── generateSpec ────────────────────────────────────────────────────────────

export interface GenerateSpecInput {
  name: string
  description: string
  features: string[]
  buildId: string
}

export interface GenerateSpecOutput {
  spec: string
  tokens: number
}

export async function generateSpec(_input: GenerateSpecInput): Promise<GenerateSpecOutput> {
  throw new Error('Activity stub — implemented in worker')
}

// ── scaffoldProject ──────────────────────────────────────────────────────────

export interface ScaffoldProjectInput {
  projectName: string
  spec: string
  buildId: string
}

export interface ScaffoldProjectOutput {
  projectPath: string
  stack: string[]
}

export async function scaffoldProject(
  _input: ScaffoldProjectInput
): Promise<ScaffoldProjectOutput> {
  throw new Error('Activity stub — implemented in worker')
}

// ── writeCode ────────────────────────────────────────────────────────────────

export interface WriteCodeInput {
  projectPath: string
  spec: string
  buildId: string
}

export interface WriteCodeOutput {
  files: string[]
}

export async function writeCode(_input: WriteCodeInput): Promise<WriteCodeOutput> {
  throw new Error('Activity stub — implemented in worker')
}

// ── buildUI ──────────────────────────────────────────────────────────────────

export interface BuildUIInput {
  projectPath: string
  buildId: string
}

export interface BuildUIOutput {
  components: number
  pages: string[]
  buildPath: string
}

export async function buildUI(_input: BuildUIInput): Promise<BuildUIOutput> {
  throw new Error('Activity stub — implemented in worker')
}

// ── runTests ─────────────────────────────────────────────────────────────────

export interface RunTestsInput {
  projectPath: string
  buildId: string
}

export interface RunTestsOutput {
  passed: boolean
  checks: string[]
}

export async function runTests(_input: RunTestsInput): Promise<RunTestsOutput> {
  throw new Error('Activity stub — implemented in worker')
}

// ── deploy ───────────────────────────────────────────────────────────────────

export interface DeployInput {
  projectName: string
  buildId: string
}

export interface DeployOutput {
  url: string
  region: string
}

export async function deploy(_input: DeployInput): Promise<DeployOutput> {
  throw new Error('Activity stub — implemented in worker')
}
