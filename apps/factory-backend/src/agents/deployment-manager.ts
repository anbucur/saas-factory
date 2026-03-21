/**
 * Deployment Manager
 *
 * Handles the full deployment lifecycle for generated SaaS projects:
 * 1. Stack detection — scans project files to determine tech stack
 * 2. Strategy selection — recommends Docker vs Vercel vs static based on stack
 * 3. Dockerfile/docker-compose generation — creates deployment configs
 * 4. Docker deployment — builds and runs containers locally
 * 5. Vercel deployment — deploys compatible frontends to Vercel
 * 6. Lifecycle management — stop, redeploy, remove obsolete deployments
 * 7. Error recovery — uses coding agent to fix deployment issues
 */

import fs from 'fs'
import path from 'path'
import { spawn, execSync } from 'child_process'
import { v4 as uuid } from 'uuid'
import { db } from '../db/index.js'
import { deployments, projects } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { runCodingAgent, isCodingAgentAvailable } from './coding-agent.js'

const GENERATED_DIR = path.resolve(process.cwd(), '../../generated')

// ── Stack Detection ─────────────────────────────────────────────────────────

export interface StackInfo {
  framework?: string
  language?: string
  runtime?: string
  hasBackend?: boolean
  hasFrontend?: boolean
  hasDatabase?: boolean
  databaseType?: string
  packageManager?: string
  isMonorepo?: boolean
  buildCommand?: string
  startCommand?: string
  frontendFramework?: string
  backendFramework?: string
  recommendedStrategies: ('docker' | 'vercel' | 'static')[]
}

export interface DeploymentOption {
  strategy: 'docker' | 'vercel' | 'static'
  label: string
  description: string
  recommended: boolean
  requirements: string[]
  estimatedTime: string
}

export function detectStack(projectDir: string): StackInfo {
  const info: StackInfo = {
    recommendedStrategies: [],
  }

  // Read package.json
  const pkgPath = path.join(projectDir, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

      // Detect package manager
      if (fs.existsSync(path.join(projectDir, 'bun.lockb'))) info.packageManager = 'bun'
      else if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) info.packageManager = 'pnpm'
      else if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) info.packageManager = 'yarn'
      else info.packageManager = 'npm'

      // Detect monorepo
      if (pkg.workspaces || fs.existsSync(path.join(projectDir, 'turbo.json')) || fs.existsSync(path.join(projectDir, 'lerna.json'))) {
        info.isMonorepo = true
      }

      // Detect language
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (allDeps.typescript || fs.existsSync(path.join(projectDir, 'tsconfig.json'))) {
        info.language = 'typescript'
      } else {
        info.language = 'javascript'
      }

      // Detect runtime
      if (allDeps.bun || info.packageManager === 'bun') info.runtime = 'bun'
      else info.runtime = 'node'

      // Detect frontend framework
      if (allDeps.next) { info.frontendFramework = 'next'; info.hasFrontend = true }
      else if (allDeps.react) { info.frontendFramework = 'react'; info.hasFrontend = true }
      else if (allDeps.vue) { info.frontendFramework = 'vue'; info.hasFrontend = true }
      else if (allDeps.svelte || allDeps['@sveltejs/kit']) { info.frontendFramework = 'svelte'; info.hasFrontend = true }
      else if (allDeps['@angular/core']) { info.frontendFramework = 'angular'; info.hasFrontend = true }

      // Detect backend framework
      if (allDeps.express) { info.backendFramework = 'express'; info.hasBackend = true }
      else if (allDeps.hono) { info.backendFramework = 'hono'; info.hasBackend = true }
      else if (allDeps.fastify) { info.backendFramework = 'fastify'; info.hasBackend = true }
      else if (allDeps.koa) { info.backendFramework = 'koa'; info.hasBackend = true }
      else if (allDeps.nest || allDeps['@nestjs/core']) { info.backendFramework = 'nest'; info.hasBackend = true }

      // Next.js is both frontend and backend
      if (info.frontendFramework === 'next') info.hasBackend = true

      // Detect database
      if (allDeps.pg || allDeps.postgres || allDeps['@prisma/client'] || allDeps.drizzle) {
        info.hasDatabase = true
        if (allDeps.pg || allDeps.postgres) info.databaseType = 'postgres'
        else if (allDeps['better-sqlite3'] || allDeps.sqlite3) info.databaseType = 'sqlite'
        else if (allDeps.mysql2) info.databaseType = 'mysql'
        else if (allDeps.mongoose || allDeps.mongodb) info.databaseType = 'mongodb'
        else info.databaseType = 'postgres' // default assumption for Prisma/Drizzle
      }
      if (allDeps['better-sqlite3'] || allDeps.sqlite3) {
        info.hasDatabase = true
        info.databaseType = 'sqlite'
      }

      // Detect build & start commands
      if (pkg.scripts?.build) info.buildCommand = `${info.packageManager} run build`
      if (pkg.scripts?.start) info.startCommand = `${info.packageManager} run start`
      else if (pkg.scripts?.dev) info.startCommand = `${info.packageManager} run dev`

      // Set main framework
      info.framework = info.frontendFramework || info.backendFramework

    } catch { /* bad package.json */ }
  }

  // Also check subdirectories for monorepo
  if (info.isMonorepo) {
    for (const dir of ['apps', 'packages', 'services']) {
      const subDir = path.join(projectDir, dir)
      if (fs.existsSync(subDir)) {
        try {
          const entries = fs.readdirSync(subDir, { withFileTypes: true })
          for (const entry of entries) {
            if (!entry.isDirectory()) continue
            const subPkg = path.join(subDir, entry.name, 'package.json')
            if (!fs.existsSync(subPkg)) continue
            const pkg = JSON.parse(fs.readFileSync(subPkg, 'utf-8'))
            const deps = { ...pkg.dependencies, ...pkg.devDependencies }
            if (deps.react || deps.next || deps.vue || deps.svelte) {
              info.hasFrontend = true
              if (!info.frontendFramework) info.frontendFramework = deps.next ? 'next' : deps.react ? 'react' : deps.vue ? 'vue' : 'svelte'
            }
            if (deps.express || deps.hono || deps.fastify || deps['@nestjs/core']) {
              info.hasBackend = true
              if (!info.backendFramework) info.backendFramework = deps.express ? 'express' : deps.hono ? 'hono' : deps.fastify ? 'fastify' : 'nest'
            }
          }
        } catch { /* skip */ }
      }
    }
  }

  // Check for existing Docker files
  const hasDockerfile = fs.existsSync(path.join(projectDir, 'Dockerfile'))
  const hasDockerCompose = fs.existsSync(path.join(projectDir, 'docker-compose.yml')) || fs.existsSync(path.join(projectDir, 'docker-compose.yaml'))

  // Determine recommended strategies
  // Docker is always an option (universal)
  info.recommendedStrategies.push('docker')

  // Vercel is good for: Next.js, React SPA, Vue, Svelte (frontend-only or Next.js full-stack)
  const vercelCompatible = ['next', 'react', 'vue', 'svelte', 'angular']
  if (info.frontendFramework && vercelCompatible.includes(info.frontendFramework)) {
    // If it's a frontend-only app or Next.js (which Vercel handles natively), recommend Vercel
    if (!info.hasBackend || info.frontendFramework === 'next') {
      info.recommendedStrategies.unshift('vercel') // Vercel first for these
    } else {
      info.recommendedStrategies.push('vercel') // Still an option but not primary
    }
  }

  // Static hosting for pure frontend builds
  if (info.hasFrontend && !info.hasBackend && !info.hasDatabase) {
    info.recommendedStrategies.push('static')
  }

  return info
}

/**
 * Returns deployment options for a project based on detected stack
 */
export function getDeploymentOptions(projectDir: string): DeploymentOption[] {
  const stack = detectStack(projectDir)
  const options: DeploymentOption[] = []
  const isDocker = isDockerAvailable()
  const isVercel = isVercelCLIAvailable()

  // Docker option
  options.push({
    strategy: 'docker',
    label: 'Docker Container',
    description: stack.hasDatabase
      ? `Run in Docker with ${stack.databaseType || 'database'} — best for full-stack apps with databases`
      : 'Run in an isolated Docker container — works with any stack',
    recommended: stack.hasBackend && stack.hasDatabase ? true : stack.recommendedStrategies[0] === 'docker',
    requirements: isDocker ? [] : ['Docker must be installed and running'],
    estimatedTime: '2-5 minutes',
  })

  // Vercel option (only if stack is compatible)
  if (stack.recommendedStrategies.includes('vercel')) {
    options.push({
      strategy: 'vercel',
      label: 'Vercel',
      description: stack.frontendFramework === 'next'
        ? 'Deploy to Vercel — native Next.js support with edge functions and serverless'
        : `Deploy ${stack.frontendFramework || 'frontend'} to Vercel — global CDN with automatic builds`,
      recommended: stack.recommendedStrategies[0] === 'vercel',
      requirements: isVercel ? [] : ['Vercel CLI must be installed (`npm i -g vercel`)'],
      estimatedTime: '1-3 minutes',
    })
  }

  // Static option
  if (stack.recommendedStrategies.includes('static')) {
    options.push({
      strategy: 'static',
      label: 'Static Files (Docker Nginx)',
      description: 'Build and serve static files via Nginx in Docker — lightweight and fast',
      recommended: false,
      requirements: isDocker ? [] : ['Docker must be installed and running'],
      estimatedTime: '1-2 minutes',
    })
  }

  return options
}

// ── Dockerfile Generation ───────────────────────────────────────────────────

export function generateDockerfile(projectDir: string, stack: StackInfo): string {
  const pm = stack.packageManager || 'npm'
  const installCmd = pm === 'yarn' ? 'yarn install --frozen-lockfile' : pm === 'pnpm' ? 'pnpm install --frozen-lockfile' : pm === 'bun' ? 'bun install' : 'npm ci'
  const runtime = stack.runtime === 'bun' ? 'oven/bun:latest' : 'node:22-alpine'

  // Next.js standalone build
  if (stack.frontendFramework === 'next') {
    return `FROM ${runtime} AS base
WORKDIR /app

# Install dependencies
COPY package*.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : pm === 'bun' ? 'bun.lockb' : 'package-lock.json*'} ./
RUN ${installCmd}

# Build
COPY . .
RUN ${pm} run build

# Production
FROM ${runtime} AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
`
  }

  // React/Vue/Svelte SPA with Nginx
  if (stack.hasFrontend && !stack.hasBackend) {
    return `FROM ${runtime} AS builder
WORKDIR /app

COPY package*.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : pm === 'bun' ? 'bun.lockb' : 'package-lock.json*'} ./
RUN ${installCmd}

COPY . .
RUN ${pm} run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing support
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`
  }

  // Full-stack app (backend + optional frontend)
  if (stack.isMonorepo) {
    return `FROM ${runtime} AS base
WORKDIR /app

# Install dependencies
COPY package*.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : pm === 'bun' ? 'bun.lockb' : 'package-lock.json*'} ./
COPY apps/ ./apps/
COPY packages/ ./packages/
${fs.existsSync(path.join(projectDir, 'turbo.json')) ? 'COPY turbo.json ./' : ''}
RUN ${installCmd}

# Build
RUN ${pm} run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ${JSON.stringify((stack.startCommand || `${pm} run start`).split(' '))}
`
  }

  // Default backend app
  return `FROM ${runtime}
WORKDIR /app

# Install dependencies
COPY package*.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : pm === 'bun' ? 'bun.lockb' : 'package-lock.json*'} ./
RUN ${installCmd}

# Copy source
COPY . .

# Build if build script exists
${stack.buildCommand ? `RUN ${stack.buildCommand}` : '# No build step detected'}

EXPOSE 3000
ENV NODE_ENV=production
CMD ${JSON.stringify((stack.startCommand || `${pm} start`).split(' '))}
`
}

export function generateDockerCompose(projectName: string, stack: StackInfo, port: number): string {
  const services: string[] = []
  const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  // Main app service
  services.push(`  ${sanitizedName}-app:
    build: .
    container_name: ${sanitizedName}-app
    ports:
      - "${port}:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000${stack.hasDatabase && stack.databaseType === 'postgres' ? `
      - DATABASE_URL=postgresql://postgres:postgres@${sanitizedName}-db:5432/${sanitizedName}` : ''}
    restart: unless-stopped${stack.hasDatabase && stack.databaseType === 'postgres' ? `
    depends_on:
      ${sanitizedName}-db:
        condition: service_healthy` : ''}`)

  // Database service if needed
  if (stack.hasDatabase && stack.databaseType === 'postgres') {
    services.push(`  ${sanitizedName}-db:
    image: postgres:16-alpine
    container_name: ${sanitizedName}-db
    environment:
      POSTGRES_DB: ${sanitizedName}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - ${sanitizedName}-pgdata:/var/lib/postgresql/data
    ports:
      - "${port + 1000}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped`)
  }

  if (stack.hasDatabase && stack.databaseType === 'mongodb') {
    services.push(`  ${sanitizedName}-db:
    image: mongo:7
    container_name: ${sanitizedName}-db
    environment:
      MONGO_INITDB_ROOT_USERNAME: mongo
      MONGO_INITDB_ROOT_PASSWORD: mongo
    volumes:
      - ${sanitizedName}-mongodata:/data/db
    ports:
      - "${port + 1000}:27017"
    restart: unless-stopped`)
  }

  let compose = `version: "3.8"

services:
${services.join('\n\n')}
`

  // Volumes
  if (stack.hasDatabase && stack.databaseType === 'postgres') {
    compose += `\nvolumes:\n  ${sanitizedName}-pgdata:\n`
  }
  if (stack.hasDatabase && stack.databaseType === 'mongodb') {
    compose += `\nvolumes:\n  ${sanitizedName}-mongodata:\n`
  }

  return compose
}

/**
 * Writes Dockerfile and docker-compose.yml to the project directory
 */
export function writeDockerFiles(projectDir: string, projectName: string, stack: StackInfo, port: number): void {
  const dockerfilePath = path.join(projectDir, 'Dockerfile')
  const composePath = path.join(projectDir, 'docker-compose.yml')

  // Only write if they don't exist (don't overwrite user-created files)
  if (!fs.existsSync(dockerfilePath)) {
    fs.writeFileSync(dockerfilePath, generateDockerfile(projectDir, stack))
  }
  if (!fs.existsSync(composePath)) {
    fs.writeFileSync(composePath, generateDockerCompose(projectName, stack, port))
  }

  // Generate .dockerignore
  const ignorePath = path.join(projectDir, '.dockerignore')
  if (!fs.existsSync(ignorePath)) {
    fs.writeFileSync(ignorePath, `node_modules
.git
.env
*.log
dist
.next
.turbo
coverage
`)
  }
}

// ── Docker Deployment ───────────────────────────────────────────────────────

function isDockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

function isVercelCLIAvailable(): boolean {
  try {
    const isWin = process.platform === 'win32'
    execSync(isWin ? 'where vercel' : 'which vercel', { stdio: 'pipe', timeout: 3000 })
    return true
  } catch {
    return false
  }
}

function findAvailablePort(startPort: number = 4000): number {
  // Check existing deployments to avoid port conflicts
  const existing = db.select().from(deployments).all()
  const usedPorts = new Set(existing.filter(d => d.port && d.status === 'running').map(d => d.port!))

  let port = startPort
  while (usedPorts.has(port) || port > 65535) {
    port++
  }
  return port
}

function execCommand(cmd: string, cwd: string, timeout = 120_000): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32'
    const proc = spawn(isWin ? 'cmd' : 'sh', [isWin ? '/c' : '-c', cmd], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
      shell: isWin,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 1 })
    })
    proc.on('error', (err) => {
      resolve({ stdout, stderr: stderr + '\n' + err.message, code: 1 })
    })
  })
}

export async function deployWithDocker(
  projectId: string,
  projectDir: string,
  projectName: string,
  stack: StackInfo,
  broadcast: (event: unknown) => void,
): Promise<{ deploymentId: string; url: string; success: boolean; error?: string }> {
  const deploymentId = uuid()
  const port = findAvailablePort()
  const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const now = new Date()

  // Create deployment record
  db.insert(deployments).values({
    id: deploymentId,
    projectId,
    strategy: 'docker',
    status: 'building',
    port,
    stackDetected: JSON.stringify(stack),
    createdAt: now,
    updatedAt: now,
  }).run()

  broadcast({
    type: 'deployment:started',
    payload: { projectId, deploymentId, strategy: 'docker' },
  })

  // Generate Docker files
  writeDockerFiles(projectDir, projectName, stack, port)
  db.update(deployments).set({ dockerfileGenerated: true, updatedAt: new Date() }).where(eq(deployments.id, deploymentId)).run()

  let buildLog = ''

  // Mark obsolete any previous running deployments for this project
  const previousDeployments = db.select().from(deployments)
    .where(and(eq(deployments.projectId, projectId), eq(deployments.status, 'running')))
    .all()

  for (const prev of previousDeployments) {
    await stopDeployment(prev.id, broadcast)
    db.update(deployments).set({ status: 'obsolete', updatedAt: new Date() }).where(eq(deployments.id, prev.id)).run()
  }

  // Build Docker image
  buildLog += `[BUILD] Building Docker image: ${sanitizedName}:latest\n`
  broadcast({ type: 'deployment:building', payload: { projectId, deploymentId, log: buildLog } })

  const buildResult = await execCommand(
    `docker build -t ${sanitizedName}:latest .`,
    projectDir,
    300_000, // 5 min timeout for build
  )

  buildLog += buildResult.stdout + buildResult.stderr
  db.update(deployments).set({ buildLog, updatedAt: new Date() }).where(eq(deployments.id, deploymentId)).run()

  if (buildResult.code !== 0) {
    // Try to fix with coding agent
    const fixed = await attemptDeploymentFix(projectId, projectDir, projectName, buildLog, 'Docker build failed', stack)
    if (fixed) {
      // Retry build
      buildLog += '\n[RETRY] Attempting rebuild after fix...\n'
      const retryBuild = await execCommand(`docker build -t ${sanitizedName}:latest .`, projectDir, 300_000)
      buildLog += retryBuild.stdout + retryBuild.stderr

      if (retryBuild.code !== 0) {
        db.update(deployments).set({
          status: 'failed',
          buildLog,
          errorLog: `Build failed after retry: ${retryBuild.stderr}`,
          retryCount: 1,
          updatedAt: new Date(),
        }).where(eq(deployments.id, deploymentId)).run()
        broadcast({ type: 'deployment:failed', payload: { projectId, deploymentId, error: 'Docker build failed after retry' } })
        return { deploymentId, url: '', success: false, error: 'Docker build failed' }
      }
    } else {
      db.update(deployments).set({
        status: 'failed',
        buildLog,
        errorLog: `Build failed: ${buildResult.stderr}`,
        updatedAt: new Date(),
      }).where(eq(deployments.id, deploymentId)).run()
      broadcast({ type: 'deployment:failed', payload: { projectId, deploymentId, error: 'Docker build failed' } })
      return { deploymentId, url: '', success: false, error: 'Docker build failed' }
    }
  }

  // Run container
  db.update(deployments).set({ status: 'deploying', updatedAt: new Date() }).where(eq(deployments.id, deploymentId)).run()

  // Check if docker-compose has db service
  const hasComposeDb = stack.hasDatabase && stack.databaseType !== 'sqlite'

  let runResult: Awaited<ReturnType<typeof execCommand>>

  if (hasComposeDb) {
    // Use docker-compose for apps with external databases
    buildLog += `\n[DEPLOY] Starting services with docker-compose on port ${port}\n`
    runResult = await execCommand(
      `docker compose up -d`,
      projectDir,
      120_000,
    )
  } else {
    // Simple docker run
    buildLog += `\n[DEPLOY] Starting container ${sanitizedName}-app on port ${port}\n`

    // Stop and remove any existing container with the same name
    await execCommand(`docker rm -f ${sanitizedName}-app 2>/dev/null || true`, projectDir, 10_000)

    runResult = await execCommand(
      `docker run -d --name ${sanitizedName}-app -p ${port}:3000 -e NODE_ENV=production --restart unless-stopped ${sanitizedName}:latest`,
      projectDir,
      30_000,
    )
  }

  buildLog += runResult.stdout + runResult.stderr

  if (runResult.code !== 0) {
    db.update(deployments).set({
      status: 'failed',
      buildLog,
      errorLog: `Container start failed: ${runResult.stderr}`,
      updatedAt: new Date(),
    }).where(eq(deployments.id, deploymentId)).run()
    broadcast({ type: 'deployment:failed', payload: { projectId, deploymentId, error: 'Container failed to start' } })
    return { deploymentId, url: '', success: false, error: 'Container failed to start' }
  }

  const containerId = runResult.stdout.trim().substring(0, 12)
  const url = `http://localhost:${port}`

  db.update(deployments).set({
    status: 'running',
    url,
    containerId,
    buildLog,
    updatedAt: new Date(),
  }).where(eq(deployments.id, deploymentId)).run()

  broadcast({ type: 'deployment:running', payload: { projectId, deploymentId, url } })

  return { deploymentId, url, success: true }
}

// ── Vercel Deployment ───────────────────────────────────────────────────────

export async function deployWithVercel(
  projectId: string,
  projectDir: string,
  projectName: string,
  stack: StackInfo,
  broadcast: (event: unknown) => void,
): Promise<{ deploymentId: string; url: string; success: boolean; error?: string }> {
  const deploymentId = uuid()
  const now = new Date()

  db.insert(deployments).values({
    id: deploymentId,
    projectId,
    strategy: 'vercel',
    status: 'building',
    stackDetected: JSON.stringify(stack),
    createdAt: now,
    updatedAt: now,
  }).run()

  broadcast({ type: 'deployment:started', payload: { projectId, deploymentId, strategy: 'vercel' } })

  // Mark previous Vercel deployments as obsolete
  const previousDeployments = db.select().from(deployments)
    .where(and(eq(deployments.projectId, projectId), eq(deployments.strategy, 'vercel'), eq(deployments.status, 'running')))
    .all()

  for (const prev of previousDeployments) {
    db.update(deployments).set({ status: 'obsolete', updatedAt: new Date() }).where(eq(deployments.id, prev.id)).run()
  }

  let buildLog = `[VERCEL] Deploying ${projectName} to Vercel...\n`
  broadcast({ type: 'deployment:building', payload: { projectId, deploymentId, log: buildLog } })

  // Verify Vercel CLI is available before attempting deployment
  if (!isVercelCLIAvailable()) {
    const errorMsg = 'Vercel CLI is not installed. Run `npm i -g vercel` then authenticate with `vercel login`.'
    buildLog += `[ERROR] ${errorMsg}\n`
    db.update(deployments).set({
      status: 'failed',
      buildLog,
      errorLog: errorMsg,
      updatedAt: new Date(),
    }).where(eq(deployments.id, deploymentId)).run()
    broadcast({ type: 'deployment:failed', payload: { projectId, deploymentId, error: errorMsg } })
    return { deploymentId, url: '', success: false, error: errorMsg }
  }

  // Deploy with Vercel CLI (no prompts, auto-confirm)
  const result = await execCommand(
    `vercel deploy --yes --prod 2>&1`,
    projectDir,
    300_000,
  )

  buildLog += result.stdout + result.stderr

  if (result.code !== 0) {
    // Try to fix with coding agent
    const fixed = await attemptDeploymentFix(projectId, projectDir, projectName, buildLog, 'Vercel deployment failed', stack)
    if (fixed) {
      buildLog += '\n[RETRY] Retrying Vercel deploy after fix...\n'
      const retryResult = await execCommand(`vercel deploy --yes --prod 2>&1`, projectDir, 300_000)
      buildLog += retryResult.stdout + retryResult.stderr

      if (retryResult.code !== 0) {
        db.update(deployments).set({
          status: 'failed',
          buildLog,
          errorLog: `Vercel deploy failed after retry: ${retryResult.stderr}`,
          retryCount: 1,
          updatedAt: new Date(),
        }).where(eq(deployments.id, deploymentId)).run()
        broadcast({ type: 'deployment:failed', payload: { projectId, deploymentId, error: 'Vercel deployment failed after retry' } })
        return { deploymentId, url: '', success: false, error: 'Vercel deployment failed' }
      }

      // Extract URL from retry
      const urlMatch = retryResult.stdout.match(/https:\/\/[^\s]+\.vercel\.app/)
      const url = urlMatch?.[0] || ''
      db.update(deployments).set({
        status: 'running',
        url,
        buildLog,
        updatedAt: new Date(),
      }).where(eq(deployments.id, deploymentId)).run()
      broadcast({ type: 'deployment:running', payload: { projectId, deploymentId, url } })
      return { deploymentId, url, success: true }
    }

    db.update(deployments).set({
      status: 'failed',
      buildLog,
      errorLog: `Vercel deploy failed: ${result.stderr}`,
      updatedAt: new Date(),
    }).where(eq(deployments.id, deploymentId)).run()
    broadcast({ type: 'deployment:failed', payload: { projectId, deploymentId, error: 'Vercel deployment failed' } })
    return { deploymentId, url: '', success: false, error: 'Vercel deployment failed' }
  }

  // Extract deployment URL from output
  const urlMatch = result.stdout.match(/https:\/\/[^\s]+\.vercel\.app/)
  const url = urlMatch?.[0] || ''

  db.update(deployments).set({
    status: 'running',
    url,
    buildLog,
    updatedAt: new Date(),
  }).where(eq(deployments.id, deploymentId)).run()

  broadcast({ type: 'deployment:running', payload: { projectId, deploymentId, url } })
  return { deploymentId, url, success: true }
}

// ── Deployment Lifecycle ────────────────────────────────────────────────────

export async function stopDeployment(
  deploymentId: string,
  broadcast: (event: unknown) => void,
): Promise<void> {
  const deployment = db.select().from(deployments).where(eq(deployments.id, deploymentId)).get()
  if (!deployment) return

  if (deployment.strategy === 'docker' && deployment.containerId) {
    await execCommand(`docker stop ${deployment.containerId} && docker rm ${deployment.containerId}`, '.', 30_000)
  }

  // For docker-compose deployments, try to stop via compose
  if (deployment.strategy === 'docker') {
    const project = db.select().from(projects).where(eq(projects.id, deployment.projectId)).get()
    if (project) {
      const projectName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const projectDir = path.join(GENERATED_DIR, projectName)
      if (fs.existsSync(path.join(projectDir, 'docker-compose.yml'))) {
        await execCommand('docker compose down', projectDir, 30_000)
      }
    }
  }

  db.update(deployments).set({
    status: 'stopped',
    stoppedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(deployments.id, deploymentId)).run()

  broadcast({ type: 'deployment:stopped', payload: { projectId: deployment.projectId, deploymentId } })
}

export async function removeObsoleteDeployments(projectId: string, broadcast: (event: unknown) => void): Promise<number> {
  const obsolete = db.select().from(deployments)
    .where(and(eq(deployments.projectId, projectId), eq(deployments.status, 'obsolete')))
    .all()

  for (const dep of obsolete) {
    if (dep.strategy === 'docker' && dep.containerId) {
      await execCommand(`docker rm -f ${dep.containerId} 2>/dev/null || true`, '.', 10_000)
    }
    db.delete(deployments).where(eq(deployments.id, dep.id)).run()
  }

  // Also clean up stopped deployments older than the latest running one
  const stopped = db.select().from(deployments)
    .where(and(eq(deployments.projectId, projectId), eq(deployments.status, 'stopped')))
    .all()

  for (const dep of stopped) {
    if (dep.strategy === 'docker' && dep.containerId) {
      await execCommand(`docker rm -f ${dep.containerId} 2>/dev/null || true`, '.', 10_000)
    }
  }

  return obsolete.length + stopped.length
}

export async function redeployProject(
  projectId: string,
  strategy: 'docker' | 'vercel' | 'static',
  broadcast: (event: unknown) => void,
): Promise<{ deploymentId: string; url: string; success: boolean; error?: string }> {
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get()
  if (!project) return { deploymentId: '', url: '', success: false, error: 'Project not found' }

  const projectName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const projectDir = path.join(GENERATED_DIR, projectName)

  if (!fs.existsSync(projectDir)) {
    return { deploymentId: '', url: '', success: false, error: 'Generated project directory not found' }
  }

  const stack = detectStack(projectDir)

  if (strategy === 'docker' || strategy === 'static') {
    return deployWithDocker(projectId, projectDir, projectName, stack, broadcast)
  } else if (strategy === 'vercel') {
    return deployWithVercel(projectId, projectDir, projectName, stack, broadcast)
  }

  return { deploymentId: '', url: '', success: false, error: `Unknown strategy: ${strategy}` }
}

// ── Error Recovery ──────────────────────────────────────────────────────────

async function attemptDeploymentFix(
  projectId: string,
  projectDir: string,
  projectName: string,
  buildLog: string,
  errorSummary: string,
  stack: StackInfo,
): Promise<boolean> {
  const codingAgent = isCodingAgentAvailable()
  if (!codingAgent.available) return false

  try {
    const result = await runCodingAgent({
      projectId,
      projectName,
      task: `The deployment of this project failed. Please analyze the error and fix the issue.

## Error Summary
${errorSummary}

## Build Log (last 3000 chars)
${buildLog.slice(-3000)}

## Detected Stack
${JSON.stringify(stack, null, 2)}

## Instructions
- Fix any issues in the Dockerfile, docker-compose.yml, or project configuration
- Fix missing dependencies or build errors
- Ensure the project builds and starts correctly
- Do NOT change the core application logic unless it's causing the build to fail
`,
      context: `Stack: ${stack.framework || 'unknown'} | Backend: ${stack.backendFramework || 'none'} | Frontend: ${stack.frontendFramework || 'none'} | DB: ${stack.databaseType || 'none'}`,
      workingDirectory: projectDir,
    })

    return result.success
  } catch {
    return false
  }
}

// ── Deployment Status Check ─────────────────────────────────────────────────

export async function checkDeploymentHealth(deploymentId: string): Promise<{ healthy: boolean; details: string }> {
  const deployment = db.select().from(deployments).where(eq(deployments.id, deploymentId)).get()
  if (!deployment) return { healthy: false, details: 'Deployment not found' }

  if (deployment.strategy === 'docker' && deployment.containerId) {
    const result = await execCommand(`docker inspect --format='{{.State.Status}}' ${deployment.containerId}`, '.', 5000)
    const status = result.stdout.trim()
    if (status === 'running') return { healthy: true, details: 'Container is running' }
    return { healthy: false, details: `Container status: ${status}` }
  }

  if (deployment.strategy === 'vercel' && deployment.url) {
    try {
      const result = await execCommand(`curl -s -o /dev/null -w "%{http_code}" ${deployment.url}`, '.', 10_000)
      const statusCode = parseInt(result.stdout.trim())
      if (statusCode >= 200 && statusCode < 400) return { healthy: true, details: `HTTP ${statusCode}` }
      return { healthy: false, details: `HTTP ${statusCode}` }
    } catch {
      return { healthy: false, details: 'Could not reach deployment URL' }
    }
  }

  return { healthy: false, details: 'Unknown deployment type' }
}

/**
 * Gets the project directory path for a project
 */
export function getProjectDir(projectName: string): string {
  const sanitized = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return path.join(GENERATED_DIR, sanitized)
}
