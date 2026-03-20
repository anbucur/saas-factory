/**
 * Temporal Activities - These are the actual work units performed by agents
 * Each activity maps to a specific agent in the factory
 */

export interface ScaffoldAppInput {
  name: string
  description: string
  features: string[]
}

export interface ScaffoldAppOutput {
  appId: string
  repoUrl: string
  stack: string[]
}

export async function scaffoldApp(input: ScaffoldAppInput): Promise<ScaffoldAppOutput> {
  // This would call Z.ai or another coding agent
  // For now, simulate the work
  console.log(`[Coder] Scaffolding: ${input.name}`)
  await new Promise((r) => setTimeout(r, 2000))

  return {
    appId: `app-${crypto.randomUUID().slice(0, 8)}`,
    repoUrl: `https://github.com/example/${input.name.toLowerCase().replace(/\s+/g, '-')}`,
    stack: ['React', 'Node.js', 'Postgres'],
  }
}

export interface BuildUIInput {
  appId: string
}

export interface BuildUIOutput {
  components: number
  pages: string[]
}

export async function buildUI(input: BuildUIInput): Promise<BuildUIOutput> {
  console.log(`[UI Agent] Building interface for: ${input.appId}`)
  await new Promise((r) => setTimeout(r, 1500))

  return {
    components: 24,
    pages: ['Dashboard', 'Settings', 'Billing', 'Profile'],
  }
}

export interface EnhanceFeatureInput {
  appId: string
  feature: string
}

export interface EnhanceFeatureOutput {
  status: 'enhanced'
  changes: number
}

export async function enhanceFeatures(
  input: EnhanceFeatureInput
): Promise<EnhanceFeatureOutput> {
  console.log(`[Enhancement Agent] Enhancing: ${input.feature}`)
  await new Promise((r) => setTimeout(r, 1000))

  return {
    status: 'enhanced',
    changes: Math.floor(Math.random() * 10) + 1,
  }
}

export interface SecurityScanInput {
  appId: string
}

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: string
  description: string
  file?: string
}

export interface SecurityScanOutput {
  scannedAt: number
  issues: SecurityIssue[]
}

export async function securityScan(input: SecurityScanInput): Promise<SecurityScanOutput> {
  console.log(`[Security Agent] Scanning: ${input.appId}`)
  await new Promise((r) => setTimeout(r, 2000))

  // Simulate finding some issues
  const issues: SecurityIssue[] = []
  if (Math.random() > 0.5) {
    issues.push({
      severity: 'medium',
      type: 'XSS',
      description: 'Potential XSS in user input',
      file: 'src/components/UserInput.tsx',
    })
  }

  return {
    scannedAt: Date.now(),
    issues,
  }
}

export interface FixSecurityIssuesInput {
  appId: string
  issues: SecurityIssue[]
}

export async function fixSecurityIssues(input: FixSecurityIssuesInput): Promise<{ fixed: number }> {
  console.log(`[Security Agent] Fixing ${input.issues.length} issues`)
  await new Promise((r) => setTimeout(r, 1500))

  return { fixed: input.issues.length }
}

export interface InjectBillingInput {
  appId: string
  mode: 'subscription' | 'usage' | 'none'
}

export async function injectBilling(input: InjectBillingInput): Promise<{ stripeMode: string }> {
  console.log(`[Billing Agent] Injecting ${input.mode} billing`)
  await new Promise((r) => setTimeout(r, 1500))

  return { stripeMode: input.mode }
}

export interface DeployAppInput {
  appId: string
}

export interface DeployAppOutput {
  url: string
  region: string
}

export async function deployApp(input: DeployAppInput): Promise<DeployAppOutput> {
  console.log(`[Deploy Agent] Deploying: ${input.appId}`)
  await new Promise((r) => setTimeout(r, 3000))

  const id = input.appId.slice(4)
  return {
    url: `https://${id}.fly.dev`,
    region: 'ams',
  }
}
