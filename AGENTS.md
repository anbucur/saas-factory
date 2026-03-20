# AGENTS.md — SaaS Factory

## Architecture Overview

npm workspaces monorepo managed by Turborepo. Three active packages:

| Package | Role | Port |
|---|---|---|
| `apps/factory-ui` | React/Vite visual board | 3000 |
| `apps/factory-backend` | Hono.js API + WebSocket broadcaster | 3001 |
| `packages/temporal-workflows` | Temporal workflow + activity definitions | — |

`apps/factory-agents` and `packages/shared`, `packages/stripe-templates` are empty stubs for future work.

**Data flow:** Ramses (OpenClaw) → `POST /api/builds` on backend → Temporal `buildSaaS` workflow → activities (Z.ai / Stripe / Railway) → WebSocket broadcast → factory-ui store.

## Dev Commands

```bash
docker compose up -d          # Start Temporal server (7233), Postgres (5432), Temporal UI (8080)
npm install                   # From root — installs all workspaces
npm run dev                   # All packages via Turbo (parallel)
npm run dev:ui                # UI only
npm run dev:backend           # Backend only (tsx watch hot-reload)
```

Turbo `build` runs `^build` first — always build `packages/temporal-workflows` before the apps.

## Key Conventions

**State is exclusively in Zustand** (`apps/factory-ui/src/store/factoryStore.ts`). No prop drilling; components call `useFactoryStore()`. Inside `setTimeout` callbacks use `useFactoryStore.getState()` (not the hook) — see `ProjectPanel.tsx` demo mode.

**`factoryStore.ts` exports constants too** — `AGENT_META` (label/color/emoji per agent) and `ZONE_POSITIONS` (board %-coords per phase). Always import these from the store, not redefined locally.

**Phase lifecycle is automatic** — when all agents in a phase have `status: 'done'`, `completeAgent()` internally calls `completePhase()`, which unlocks the next phase. The fixed sequence is `poc → enhance → security → prod` (defined as `PHASE_ORDER` in the store).

**WebSocket events are a typed union** in `apps/factory-ui/src/types/index.ts` (`WSEvent`). Every new event type must be added there. Backend broadcasts via the `broadcast()` helper in `index.ts`; Hono doesn't natively handle WS upgrades — the manual upgrade pattern in `/ws` is intentional.

**Agent positioning on the board** uses `%`-based absolute positioning. `ZONE_POSITIONS` (in store) places the zone center; per-type offsets are hardcoded in `Board.tsx` (`agentOffsets`). Add new agent types to both `AgentType` in `types/index.ts` and `AGENT_META` + `agentOffsets`.

**Styling**: dark zinc palette (`bg-zinc-950` base), Tailwind only — no CSS modules. Animations via Framer Motion `motion.*` components with inline `animate`/`transition` props.

## Temporal Workflow Structure

`packages/temporal-workflows/src/workflows.ts` — `buildSaaS(spec)` orchestrates 4 sequential phases. Activities in `activities.ts` are currently stubs (simulated with `setTimeout`). All activities share the same proxy config: 10 min timeout, 3 retries. When implementing real activity bodies, keep the existing Input/Output interfaces.

## Integration Points

- **Backend → Frontend**: WebSocket at `ws://localhost:3001/ws` using the `WSEvent` union
- **Backend → Temporal**: `@temporalio/client` (imported, not yet wired to `POST /api/builds`)
- **Ramses control**: External — connects to factory backend URL via OpenClaw config
- **Logs**: Capped at 100 entries in the store (`.slice(-99)` in `addLog`)

