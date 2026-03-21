# CLAUDE.md — SaaS Factory

This file provides guidance for AI assistants (Claude, Copilot, etc.) working in this repository.

## Project Overview

**SaaS Factory** is an AI-powered platform that automates the creation of complete SaaS applications. A multi-agent system — orchestrated via Temporal — coordinates 7 specialized AI agents (PM, BA, Architect, Frontend Dev, Backend Dev, QA, DevOps) to build entire projects from requirements through deployment.

Key integrations:
- **LLM**: MiniMax API for agent reasoning; Anthropic Claude for code generation
- **Orchestration**: Temporal workflows for durable, phase-based execution
- **Real-time**: WebSocket broadcasts keep the React frontend in sync

---

## Repository Structure

```
saas-factory/
├── apps/
│   ├── factory-backend/     # Hono.js API + Temporal worker + WebSocket (port 3010)
│   └── factory-ui/          # React + Vite frontend (port 3000)
├── packages/
│   └── temporal-workflows/  # Temporal workflow & activity definitions
├── generated/               # Output directory for AI-generated SaaS projects
├── docker-compose.yml       # Temporal server + PostgreSQL
├── turbo.json               # Turborepo task config
└── package.json             # Monorepo root (npm workspaces)
```

### `apps/factory-backend/src/`

| File/Dir | Purpose |
|---|---|
| `index.ts` | Hono HTTP server, CORS, WebSocket setup, Temporal client |
| `worker.ts` | Temporal worker — registers activities, orchestrates agent phases |
| `agents/roles.ts` | All 7 agent role definitions with system prompts, colors, phase lists |
| `agents/llm.ts` | MiniMax LLM API calls; returns template responses when no API key |
| `agents/coding-agent.ts` | Detects and invokes Claude Code CLI (or opencode as fallback) |
| `agents/engine.ts` | AgentEngine class — project creation and status tracking |
| `routes/projects.ts` | REST endpoints for project, task, conversation, artifact CRUD |
| `db/schema.ts` | Drizzle ORM schema — 7 tables |
| `db/index.ts` | SQLite database initialization |
| `code-templates.ts` | Default code templates for generated projects |

### `apps/factory-ui/src/`

| File/Dir | Purpose |
|---|---|
| `main.tsx` | React entry point |
| `App.tsx` | Root router |
| `pages/` | Dashboard, NewProject, ProjectDetail, Settings |
| `components/` | Reusable UI components |
| `store/store.ts` | Zustand store — single source of truth |
| `types/index.ts` | All shared types, enums, and UI constants |
| `hooks/useWebSocket.ts` | WebSocket connection and typed event handling |
| `lib/api.ts` | API client functions |

### `packages/temporal-workflows/src/`

| File | Purpose |
|---|---|
| `workflows.ts` | `buildSaaSProject` Temporal workflow |
| `activities.ts` | Activity implementations per phase/agent |
| `index.ts` | Public exports |

---

## Development Setup

### Prerequisites

- Docker + Docker Compose (for Temporal + PostgreSQL)
- Node.js 22+
- npm 10+

### Quick Start

```bash
# 1. Start Temporal services
docker compose up -d

# 2. Install all dependencies
npm install

# 3. Start backend (port 3010)
npm run dev:backend

# 4. Start frontend (port 3000) — in a separate terminal
npm run dev:ui

# Open http://localhost:3000
```

### All Dev Commands

```bash
npm run dev            # All workspaces via Turbo (parallel)
npm run dev:backend    # Backend only
npm run dev:ui         # Frontend only
npm run build          # Build all packages
npm run test           # Run all tests (Vitest)
npm run lint           # Lint all workspaces
```

---

## Architecture & Data Flow

1. User creates a project via the UI → `POST /api/projects`
2. Backend creates the project + 7 agent records in SQLite
3. User starts the project → `POST /api/projects/:id/start`
4. Backend triggers `buildSaaSProject` Temporal workflow
5. Temporal executes phase-by-phase: `requirements → architecture → development → testing → deployment → completed`
6. Each phase activates the relevant agents, which call MiniMax LLM and store results as conversations/tasks/artifacts
7. During `development`, Claude Code CLI is invoked to generate actual code into `generated/<project>/`
8. WebSocket broadcasts typed `WSEvent` updates to the frontend in real time

### Phase → Agent Mapping

| Phase | Active Agents |
|---|---|
| `requirements` | pm, ba |
| `architecture` | pm, architect |
| `development` | pm, frontend_dev, backend_dev |
| `testing` | pm, qa, frontend_dev, backend_dev |
| `deployment` | pm, devops |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MINIMAX_API_KEY` | No | MiniMax LLM API key. If absent, agents use template fallback responses. |
| `PORT` | No | Backend HTTP port (default: `3010`) |

Set these in a `.env` file at `apps/factory-backend/` or export them in your shell before running `npm run dev:backend`.

### Claude Code CLI Detection

`apps/factory-backend/src/agents/coding-agent.ts` auto-detects the Claude Code binary in order:
1. `/opt/node22/bin/claude`
2. `/usr/local/bin/claude`
3. `/usr/bin/claude`
4. `which claude` (PATH lookup)
5. Falls back to `opencode` if Claude Code is not found

Claude Code is invoked with `--print --dangerously-skip-permissions` and a 10-minute timeout. Generated projects are written to `../../generated/<project-name>/` relative to the backend's `cwd`.

---

## Key Conventions

### TypeScript

- **Strict mode** is enabled in all `tsconfig.json` files.
- All shared types live in `apps/factory-ui/src/types/index.ts` — import from there, do not duplicate.
- Backend uses ES2022 module resolution; frontend uses ES2020 with JSX.
- Avoid `any`; use explicit types or generics.

### State Management (Frontend)

- Single Zustand store at `apps/factory-ui/src/store/store.ts` via `useAppStore`.
- Do not create additional stores; extend the existing one.
- WebSocket events flow through the store's dispatch mechanism.

### Styling (Frontend)

- Tailwind CSS only — no CSS modules or inline styles.
- Dark zinc palette: base background is `bg-zinc-950`.
- Icons: `lucide-react` only.
- Animations: Framer Motion for complex transitions; Tailwind `animate-*` for simple ones.
- Agent colors defined in `AGENT_ROLE_META` in `types/index.ts` — use those, don't hardcode.

### Database

- ORM: Drizzle with `better-sqlite3`.
- Schema is defined in `apps/factory-backend/src/db/schema.ts`.
- Do not write raw SQL — use Drizzle query builders.
- Schema has 7 tables: `projects`, `agents`, `conversations`, `messages`, `tasks`, `artifacts`, `activityLog`.

### API Design (Backend)

- Framework: Hono.js.
- All project routes are under `/api/projects` in `apps/factory-backend/src/routes/projects.ts`.
- Validate request bodies with Zod.
- Use typed `WSEvent` union from `apps/factory-ui/src/types/index.ts` when broadcasting WebSocket messages.

### WebSocket Events

All real-time events are typed as the `WSEvent` union (defined in `types/index.ts`). Key event types:

- `project:started`, `project:completed`, `project:failed`, `project:paused`
- `phase:started`, `phase:completed`
- `agent:status`, `agent:progress`
- `message:created`, `task:created`, `artifact:created`, `conversation:created`
- `activity:log`

### Temporal Workflows

- Workflow definitions: `packages/temporal-workflows/src/workflows.ts`
- Activities: `packages/temporal-workflows/src/activities.ts`
- The Temporal worker runs **in-process** inside the backend server (started in `index.ts`).
- Task queue name: keep consistent — do not introduce additional task queues without updating both worker and client.

---

## Testing

Framework: **Vitest** (all packages).

```bash
npm run test                   # Run all tests
npx vitest --project factory-backend   # Backend tests only
npx vitest --project factory-ui        # Frontend tests only
```

Test files are co-located in `src/__tests__/` within each package.

### Test Patterns

- **Backend** (`apps/factory-backend/src/__tests__/api.test.ts`): Tests agent roles, phase config, LLM fallback, coding agent detection, database schema, AgentEngine, and parallel agent execution.
- **Frontend** (`apps/factory-ui/src/__tests__/components.test.ts`): Type contract validation, Zustand store behavior, API client shape, WebSocket event completeness.
- **Workflows** (`packages/temporal-workflows/src/__tests__/workflows.test.ts`): Activity interfaces, workflow sequence, BuildResult shapes.

Tests use standard `expect` assertions — no custom matchers. Long-running integration tests (e.g., full phase execution) use a 60-second timeout.

---

## Agent Role Reference

| Role Key | Title | Color | Phases |
|---|---|---|---|
| `pm` | Project Manager | `#3b82f6` (blue) | All phases |
| `ba` | Business Analyst | `#8b5cf6` (purple) | requirements |
| `architect` | Solution Architect | `#f59e0b` (amber) | architecture |
| `frontend_dev` | Frontend Developer | `#06b6d4` (cyan) | development, testing |
| `backend_dev` | Backend Developer | `#10b981` (green) | development, testing |
| `qa` | QA Engineer | `#ef4444` (red) | testing |
| `devops` | DevOps Engineer | `#f97316` (orange) | deployment |

Full system prompts and capability arrays are in `apps/factory-backend/src/agents/roles.ts`.

---

## API Endpoint Reference

```
GET    /api/health
GET    /api/agents/roles
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
POST   /api/projects/:id/start
DELETE /api/projects/:id
GET    /api/projects/:id/agents
GET    /api/projects/:id/conversations
GET    /api/projects/:id/conversations/:cid/messages
GET    /api/projects/:id/tasks
PATCH  /api/projects/:id/tasks/:tid
GET    /api/projects/:id/artifacts
GET    /api/projects/:id/logs
WS     /ws
```

---

## Monorepo Notes

- **Package manager**: npm with workspaces (`apps/*`, `packages/*`).
- **Build orchestrator**: Turborepo — `turbo.json` defines task pipelines and caching.
- Always run `npm install` from the **root** — not from individual package directories.
- Shared types between frontend and backend are currently duplicated by design (frontend `types/index.ts` is the canonical source for UI constants; backend `agents/roles.ts` is the canonical source for agent definitions). If you add a new agent role or phase, update **both**.

---

## Important Paths

| What | Path |
|---|---|
| Agent role definitions | `apps/factory-backend/src/agents/roles.ts` |
| Shared frontend types & constants | `apps/factory-ui/src/types/index.ts` |
| Zustand store | `apps/factory-ui/src/store/store.ts` |
| Database schema | `apps/factory-backend/src/db/schema.ts` |
| Temporal worker | `apps/factory-backend/src/worker.ts` |
| Temporal workflows | `packages/temporal-workflows/src/workflows.ts` |
| Coding agent (Claude Code) | `apps/factory-backend/src/agents/coding-agent.ts` |
| Generated project output | `generated/` (git-ignored) |
