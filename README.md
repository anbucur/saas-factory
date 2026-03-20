# 🏭 SaaS Factory

AI-powered SaaS factory — controlled by Ramses via OpenClaw. Visual, parallel, delightful.

## Architecture

```
User chat (OpenClaw)
       │
       ▼
   Ramses 🤖
       │
       ▼
   Temporal ⏱️ (workflow orchestration)
       │
       ├── Z.ai agents (coding)
       ├── Stripe (billing injection)
       └── Railway (deployment)
       │
       ▼
   Factory UI 🎨 (real-time visual board)
```

## Quick Start

### 1. Start Temporal (requires Docker)

```bash
cd saas-factory
docker compose up -d
```

Temporal UI will be at http://localhost:8080

### 2. Install dependencies

```bash
npm install
```

### 3. Start the backend

```bash
npm run dev --workspace=apps/factory-backend
```

### 4. Start the frontend

```bash
npm run dev --workspace=apps/factory-ui
```

Open http://localhost:3000

### 5. Connect Ramses (optional)

Add the factory backend URL to your OpenClaw configuration to let Ramses control the factory via chat.

## Tech Stack

| Layer | Technology |
|---|---|
| Orchestrator | Ramses (OpenClaw) |
| Workflow Engine | Temporal |
| Coding Agents | Z.ai |
| LLM | MiniMax + Anthropic Claude |
| Frontend | React + Tailwind + Framer Motion |
| Backend | Hono.js |
| Billing | Stripe |
| Deployment | Railway |

## Projects

- `apps/factory-ui` — Visual board with agent characters
- `apps/factory-backend` — Hono API server
- `packages/temporal-workflows` — Temporal workflow definitions

## License

Private — Alex & Ramses 🔱
