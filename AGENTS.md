# AGENTS.md — SaaS Factory v2

## Architecture Overview

npm workspaces monorepo managed by Turborepo. Two active packages:

| Package | Role | Port |
|---|---|---|
| `apps/factory-ui` | React/Vite frontend with routing | 3000 |
| `apps/factory-backend` | Hono.js API + WebSocket + Agent Engine | 3010 |

**Data flow:** User creates project → Backend creates project + 7 agents in SQLite → User starts project → AgentEngine orchestrates agents through 5 phases → Each agent calls MiniMax LLM API → Results stored as conversations, tasks, artifacts → WebSocket broadcasts real-time updates → Frontend updates via Zustand store.

## Agent Roles

| Role | Title | Phases | Description |
|---|---|---|---|
| `pm` | Project Manager | All | Coordinates team, manages plans |
| `ba` | Business Analyst | Requirements | Gathers requirements, creates user stories |
| `architect` | Solution Architect | Architecture | Designs system architecture, API contracts |
| `frontend_dev` | Frontend Developer | Development, Testing | Implements UI components and pages |
| `backend_dev` | Backend Developer | Development, Testing | Implements APIs and business logic |
| `qa` | QA Engineer | Testing | Creates test plans, finds bugs |
| `devops` | DevOps Engineer | Deployment | CI/CD, Docker, production deployment |

## Development Phases

`requirements → architecture → development → testing → deployment → completed`

Each phase activates specific agents. PM participates in all phases. Phases run sequentially; agents within a phase run sequentially.

## Dev Commands

```bash
docker compose up -d          # Start Temporal server, Postgres, Temporal UI (optional now)
npm install                   # From root — installs all workspaces
npm run dev                   # All packages via Turbo (parallel)
npm run dev:ui                # UI only (port 3000)
npm run dev:backend           # Backend only (port 3010, tsx watch)
npm run test                  # Run all tests
```

## Key Conventions

**State is in Zustand** (`apps/factory-ui/src/store/store.ts`). Single store handles projects list, current project detail, WebSocket events, and UI state.

**Types are centralized** in `apps/factory-ui/src/types/index.ts`. Includes `AGENT_ROLE_META` and `PHASE_META` constants. Backend has its own role definitions in `apps/factory-backend/src/agents/roles.ts`.

**Database is SQLite** via better-sqlite3 + Drizzle ORM. Schema in `apps/factory-backend/src/db/schema.ts`. Tables: projects, agents, conversations, messages, tasks, artifacts, activity_log.

**Agent Engine** (`apps/factory-backend/src/agents/engine.ts`) orchestrates the multi-agent workflow. Uses MiniMax LLM API with fallback responses when no API key is set.

**WebSocket events are typed** in `types/index.ts` (`WSEvent` union). Events include: project lifecycle, phase transitions, agent status/progress, messages, tasks, artifacts, activity logs.

**Styling**: dark zinc palette (`bg-zinc-950` base), Tailwind CSS, no CSS modules. Icons from lucide-react.

## Frontend Screens

1. **Dashboard** (`/`) — Project list with stats, create/start/delete projects
2. **New Project** (`/new`) — Multi-step wizard: basics, tech stack, features, review
3. **Project Detail** (`/project/:id`) — Tabbed view with:
   - Overview: phase pipeline, agent status, stats
   - Team: agent cards with progress and tasks
   - Conversations: agent-to-agent discussions by phase
   - Sprint Board: kanban board with tasks by sprint
   - Artifacts: generated documents and deliverables
   - Activity: real-time activity log

## API Endpoints

```
GET  /api/health                              — Health check
GET  /api/agents/roles                        — Agent role definitions
GET  /api/projects                            — List all projects
POST /api/projects                            — Create project
GET  /api/projects/:id                        — Get project detail
POST /api/projects/:id/start                  — Start agent orchestration
DEL  /api/projects/:id                        — Delete project
GET  /api/projects/:id/agents                 — Project agents
GET  /api/projects/:id/conversations          — Project conversations
GET  /api/projects/:id/conversations/:cid/messages — Conversation messages
GET  /api/projects/:id/tasks                  — Project tasks
PATCH /api/projects/:id/tasks/:tid            — Update task
GET  /api/projects/:id/artifacts              — Project artifacts
GET  /api/projects/:id/logs                   — Activity log
WS   /ws                                      — Real-time updates
```

## Environment Variables

- `MINIMAX_API_KEY` — MiniMax API key for LLM-powered agent responses (optional, falls back to templates)
- `PORT` — Backend port (default: 3010)
