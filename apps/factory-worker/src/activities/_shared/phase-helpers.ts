/**
 * Phase task helpers for generating agent subtasks
 */

export function getTaskDescription(phase: string, role: string): string {
  const map: Record<string, Record<string, string>> = {
    requirements: {
      pm: 'Creating project plan and sprint structure',
      ba: 'Analyzing requirements and writing user stories',
    },
    architecture: {
      architect: 'Designing system architecture and API contracts',
      pm: 'Reviewing architecture proposal',
    },
    development: {
      pm: 'Coordinating development team',
      frontend_dev: 'Building UI components and pages',
      backend_dev: 'Implementing API endpoints and database',
    },
    testing: {
      qa: 'Running tests and creating test reports',
      frontend_dev: 'Fixing frontend bugs',
      backend_dev: 'Fixing backend bugs',
      pm: 'Reviewing test results',
    },
    deployment: {
      devops: 'Setting up CI/CD and deploying',
      pm: 'Verifying launch checklist',
    },
  }
  return map[phase]?.[role] ?? `Working on ${phase}`
}

export interface Subtask {
  label: string
  prompt: string
  maxTokens?: number
}

export function getPhaseSubtasks(phase: string, role: string): Subtask[] {
  if (phase === 'requirements') {
    if (role === 'pm') return [
      { label: 'Drafting project charter', prompt: 'Write a concise project charter: business objective, success metrics, and key stakeholders. 2-3 paragraphs.', maxTokens: 800 },
      { label: 'High-level timeline', prompt: 'Create a high-level timeline with 4-5 major milestones and their dates relative to project start. Use a markdown list.', maxTokens: 600 },
      { label: 'Planning sprints', prompt: 'Define 3 sprints with clear goals and deliverables per sprint. Use a markdown table.', maxTokens: 800 },
      { label: 'Risk register', prompt: 'Identify 3-5 potential risks for this project and provide mitigations for each. Use a table.', maxTokens: 700 },
    ]
    if (role === 'ba') return [
      { label: 'User personas', prompt: 'Identify 2 primary user personas. For each: goals and pain points. 4-5 bullet points each.', maxTokens: 700 },
      { label: 'Functional stories (Core)', prompt: 'Write 4 critical user stories for the core features in "As a... I want... so that..." format with 2 criteria each.', maxTokens: 800 },
      { label: 'Functional stories (Admin)', prompt: 'Write 4 user stories for administrative or secondary features including auth and settings.', maxTokens: 800 },
      { label: 'Core data model', prompt: 'Define the core data entities and their key fields (5-8 fields each) in a markdown table.', maxTokens: 800 },
    ]
  }
  if (phase === 'architecture') {
    if (role === 'architect') return [
      { label: 'System components', prompt: 'Describe the high-level architecture: frontend, backend, and database choices with brief rationale.', maxTokens: 800 },
      { label: 'Component interfaces', prompt: 'Detail how the major components interact. List 3-4 key internal interfaces or service boundaries.', maxTokens: 700 },
      { label: 'API Blueprint (Part 1)', prompt: 'Define the 3 most important GET endpoints including path, parameters, and response shape.', maxTokens: 900 },
      { label: 'API Blueprint (Part 2)', prompt: 'Define the 3 most important POST/PUT endpoints including path, request body, and auth requirements.', maxTokens: 900 },
      { label: 'Database schema', prompt: 'Provide a detailed database schema: tables, columns, types, and primary/foreign keys. Use markdown.', maxTokens: 900 },
      { label: 'Security strategy', prompt: 'Define the authentication flow, authorization (RBAC), and sensitive data protection measures.', maxTokens: 800 },
    ]
    if (role === 'pm') return [
      { label: 'Architecture review', prompt: 'Review the architecture and list 3 strengths and 2 potential scalability risks.', maxTokens: 600 },
      { label: 'Go/No-go assessment', prompt: 'Provide a final recommendation on whether to proceed to development based on the design.', maxTokens: 400 },
    ]
  }
  if (phase === 'development') {
    if (role === 'pm') return [
      { label: 'Dev coordination', prompt: 'Write a developer coordination note detailing parallel work streams and integration checkpoints.', maxTokens: 400 },
      { label: 'Blocker assessment', prompt: 'Analyze potential technical blockers for this stack and suggest preventative measures.', maxTokens: 500 },
    ]
    if (role === 'frontend_dev') return [
      { label: 'Folder structure & setup', prompt: 'Define the frontend app structure, folder layout, and core configuration files (routing, types).', maxTokens: 800 },
      { label: 'Design system & theme', prompt: 'Define the design tokens (colors, typography) and 5 core reusable UI components.', maxTokens: 800 },
      { label: 'Feature implementation (A)', prompt: 'Write the TypeScript/JSX code for the primary user dashboard or landing page.', maxTokens: 1200 },
      { label: 'Feature implementation (B)', prompt: 'Write the code for the main functional feature (e.g. search, editor, or list view).', maxTokens: 1200 },
    ]
    if (role === 'backend_dev') return [
      { label: 'API Server structure', prompt: 'Define the backend folder structure, middleware chain, and error handling pattern.', maxTokens: 800 },
      { label: 'Database & Auth layer', prompt: 'Implement the database connection logic and the core authentication/authorization middleware.', maxTokens: 900 },
      { label: 'Endpoint group (A)', prompt: 'Implement the two most critical data retrieval (GET) endpoints with validation and DB queries.', maxTokens: 1200 },
      { label: 'Endpoint group (B)', prompt: 'Implement the two most critical mutation (POST/PUT) endpoints with validation and error handling.', maxTokens: 1200 },
    ]
  }
  if (phase === 'testing') {
    if (role === 'qa') return [
      { label: 'Test strategy', prompt: 'Define the overall testing strategy: scope, tooling, and environment requirements.', maxTokens: 700 },
      { label: 'Unit test cases', prompt: 'Write 4-5 unit test scenarios for critical business logic with expected results.', maxTokens: 800 },
      { label: 'Integration test cases', prompt: 'Write 3-4 end-to-end integration scenarios for the core user flows.', maxTokens: 800 },
      { label: 'Security audit cases', prompt: 'List 3 critical security tests focusing on auth bypass and data leak prevention.', maxTokens: 700 },
    ]
    if (role === 'frontend_dev') return [
      { label: 'UI bug fixes', prompt: 'Identify and describe fixes for 3 common UI issues: responsive layout bugs, state race conditions, and error boundaries.', maxTokens: 800 },
    ]
    if (role === 'backend_dev') return [
      { label: 'API bug fixes', prompt: 'Identify and describe fixes for 3 common API issues: edge case validation, DB timeout handling, and slow queries.', maxTokens: 800 },
    ]
    if (role === 'pm') return [
      { label: 'Testing sign-off', prompt: 'Review test results and provide an official sign-off summary with known issues list.', maxTokens: 500 },
    ]
  }
  if (phase === 'deployment') {
    if (role === 'devops') return [
      { label: 'Infrastructure as Code', prompt: 'Write a production-ready Dockerfile and docker-compose.yml with environment variable mapping.', maxTokens: 1000 },
      { label: 'CI/CD Pipeline', prompt: 'Design a GitHub Actions or GitLab CI pipeline for build, test, and container push.', maxTokens: 900 },
      { label: 'Deployment runbook', prompt: 'Write a step-by-step deployment and rollback guide with health check verification.', maxTokens: 800 },
    ]
    if (role === 'pm') return [
      { label: 'Launch checklist', prompt: 'Complete the launch readiness checklist: technical, business, and legal checkmarks.', maxTokens: 600 },
      { label: 'Live monitoring setup', prompt: 'Identify 5 critical health metrics to monitor in production and their alert thresholds.', maxTokens: 600 },
    ]
  }
  return [{ label: `Working on ${phase}`, prompt: `Please perform your key ${phase} phase responsibilities for this project.`, maxTokens: 1000 }]
}

export function getPhasePrompt(phase: string, role: string): string {
  return getPhaseSubtasks(phase, role).map(t => t.prompt).join('\n\n')
}

export function getMessageType(phase: string, role: string): string {
  if (role === 'pm') return 'decision'
  if (phase === 'requirements' || phase === 'architecture') return 'discussion'
  if (phase === 'testing') return 'review'
  return 'task_update'
}

export function getArtifactType(phase: string, role: string): string | null {
  if (phase === 'requirements' && role === 'ba') return 'spec'
  if (phase === 'requirements' && role === 'pm') return 'documentation'
  if (phase === 'architecture' && role === 'architect') return 'architecture'
  if (phase === 'design') return 'design_doc'
  if (phase === 'development' && (role === 'frontend_dev' || role === 'backend_dev')) return 'code'
  if (phase === 'testing' && role === 'qa') return 'test_report'
  if (phase === 'deployment' && role === 'devops') return 'deployment_config'
  return null
}
