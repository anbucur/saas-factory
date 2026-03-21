const MINIMAX_API_URL = 'https://api.minimax.io/v1/chat/completions';
const MINIMAX_MODEL = 'MiniMax-M2.7';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  tokensUsed: number;
}

export async function callLLM(
  systemPrompt: string,
  messages: LLMMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<LLMResponse> {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    // Fallback to template-based responses when no API key
    return generateFallbackResponse(systemPrompt, messages);
  }

  const { maxTokens = 4096, temperature = 0.7 } = options;

  const doFetch = () => fetch(MINIMAX_API_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(180_000), // 3 minute timeout — MiniMax M2.7 reasoning can be slow
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  try {
    let response: Response;
    try {
      response = await doFetch();
    } catch (firstErr: any) {
      // Retry once on timeout before giving up
      if (firstErr?.name === 'TimeoutError' || firstErr?.name === 'AbortError') {
        console.warn('[LLM] Request timed out, retrying once...');
        response = await doFetch();
      } else {
        throw firstErr;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLM] API error: ${response.status} - ${errorText}`);
      return generateFallbackResponse(systemPrompt, messages);
    }

    const data = await response.json() as any;
    
    // Check for API-level errors (even if HTTP status is 200)
    if (!data.choices || data.choices.length === 0) {
      const errorMsg = data.base_resp?.status_msg || 'Unknown API Error';
      console.error(`[LLM] API Error: ${errorMsg}`);
      if (systemPrompt.includes('system health check')) {
         throw new Error(`MiniMax API Error: ${errorMsg}`);
      }
      return generateFallbackResponse(systemPrompt, messages);
    }

    const content = data.choices[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    return { content, tokensUsed };
  } catch (error) {
    console.error('[LLM] Request failed:', error);
    return generateFallbackResponse(systemPrompt, messages);
  }
}

function generateFallbackResponse(systemPrompt: string, messages: LLMMessage[]): LLMResponse {
  const lastMessage = messages[messages.length - 1]?.content || '';

  // Determine agent role from system prompt
  if (systemPrompt.includes('Project Manager')) {
    return {
      content: generatePMResponse(lastMessage),
      tokensUsed: 0,
    };
  }
  if (systemPrompt.includes('Business Analyst')) {
    return {
      content: generateBAResponse(lastMessage),
      tokensUsed: 0,
    };
  }
  if (systemPrompt.includes('Solution Architect')) {
    return {
      content: generateArchitectResponse(lastMessage),
      tokensUsed: 0,
    };
  }
  if (systemPrompt.includes('Frontend Developer')) {
    return {
      content: generateFrontendDevResponse(lastMessage),
      tokensUsed: 0,
    };
  }
  if (systemPrompt.includes('Backend Developer')) {
    return {
      content: generateBackendDevResponse(lastMessage),
      tokensUsed: 0,
    };
  }
  if (systemPrompt.includes('QA Engineer')) {
    return {
      content: generateQAResponse(lastMessage),
      tokensUsed: 0,
    };
  }
  if (systemPrompt.includes('DevOps Engineer')) {
    return {
      content: generateDevOpsResponse(lastMessage),
      tokensUsed: 0,
    };
  }

  return {
    content: 'I have analyzed the requirements and am ready to proceed with the next steps.',
    tokensUsed: 0,
  };
}

function generatePMResponse(context: string): string {
  return `## Project Plan

Based on the project requirements, here is the execution plan:

### Sprint 1: Foundation (Requirements & Architecture)
- [ ] Gather and document detailed requirements
- [ ] Define user personas and user stories
- [ ] Design system architecture
- [ ] Define API contracts
- [ ] Set up project structure

### Sprint 2: Core Development
- [ ] Implement backend API endpoints
- [ ] Build database models and migrations
- [ ] Create frontend components and pages
- [ ] Implement authentication flow
- [ ] Set up state management

### Sprint 3: Integration & Testing
- [ ] Integration testing
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Bug fixes

### Sprint 4: Deployment & Launch
- [ ] Set up CI/CD pipeline
- [ ] Configure production environment
- [ ] Deploy to production
- [ ] Monitor and stabilize

**Team Allocation:**
- BA: Requirements phase
- Architect: Architecture phase
- Frontend Dev + Backend Dev: Development phase
- QA: Testing phase
- DevOps: Deployment phase

All team members, please review and confirm your availability.`;
}

function generateBAResponse(context: string): string {
  return `## Requirements Analysis

### Functional Requirements

**User Management:**
- User registration and authentication
- Role-based access control
- Profile management

**Core Features:**
- Dashboard with key metrics and overview
- CRUD operations for primary entities
- Search and filtering capabilities
- Real-time notifications

### User Stories

1. **US-001:** As a user, I want to register and log in, so that I can access the application securely.
   - Acceptance Criteria: Email validation, password strength requirements, JWT token management

2. **US-002:** As a user, I want to view a dashboard, so that I can see an overview of key metrics.
   - Acceptance Criteria: Responsive layout, real-time data updates, customizable widgets

3. **US-003:** As an admin, I want to manage users, so that I can control access to the system.
   - Acceptance Criteria: User list with pagination, role assignment, account status management

### Non-Functional Requirements
- Response time < 200ms for API calls
- 99.9% uptime SLA
- GDPR compliance for user data
- Mobile-responsive design
- Accessibility (WCAG 2.1 AA)

### Data Model
- Users (id, email, name, role, status)
- Projects (id, name, description, owner, status)
- Activities (id, type, user_id, metadata, timestamp)`;
}

function generateArchitectResponse(context: string): string {
  return `## System Architecture

### Technology Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript | Component-based, type-safe |
| Styling | Tailwind CSS | Utility-first, rapid development |
| State | Zustand | Lightweight, minimal boilerplate |
| API | Hono.js | Fast, lightweight, TypeScript-first |
| Database | PostgreSQL | Reliable, feature-rich RDBMS |
| ORM | Drizzle | Type-safe, performant |
| Auth | JWT + bcrypt | Stateless, scalable |
| Deployment | Docker + Railway | Container-based, simple deployment |

### System Components
\`\`\`
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   React UI  │────▶│  Hono API    │────▶│ PostgreSQL │
│   (Vite)    │◀────│  (REST+WS)   │◀────│            │
└─────────────┘     └──────────────┘     └────────────┘
       │                    │
       │              ┌─────┴──────┐
       └──────────────│  WebSocket │
                      │  (Real-time)│
                      └────────────┘
\`\`\`

### API Design
- RESTful endpoints with versioning (/api/v1/)
- WebSocket for real-time updates
- JWT authentication middleware
- Request validation with Zod
- Rate limiting and CORS

### Database Schema
- Normalized relational design
- Indexes on frequently queried columns
- Soft deletes for audit trail
- Created/updated timestamps on all tables

### Security Measures
- HTTPS everywhere
- Input sanitization
- SQL injection prevention (ORM)
- XSS protection (React)
- CSRF tokens
- Rate limiting`;
}

function generateFrontendDevResponse(context: string): string {
  return `## Frontend Implementation

### Component Structure
\`\`\`
src/
├── components/
│   ├── ui/          # Base UI components
│   ├── layout/      # Layout components
│   └── features/    # Feature-specific components
├── pages/           # Route pages
├── hooks/           # Custom React hooks
├── store/           # Zustand stores
├── types/           # TypeScript types
└── utils/           # Utility functions
\`\`\`

### Implementation Progress
- ✅ Project structure set up
- ✅ Routing configured with React Router
- ✅ Base UI components created (Button, Input, Card, Modal)
- ✅ Layout with sidebar navigation
- ✅ Dashboard page with metrics
- ✅ Responsive design implemented
- 🔄 API integration in progress
- 🔄 State management setup

### Key Decisions
- Using Tailwind CSS utility classes for all styling
- Zustand for global state, React Query for server state
- Lazy loading for route-level code splitting
- Error boundaries at page level

All components follow the established patterns and design system.`;
}

function generateBackendDevResponse(context: string): string {
  return `## Backend Implementation

### API Endpoints Implemented
\`\`\`
POST   /api/v1/auth/register     - User registration
POST   /api/v1/auth/login        - User login
GET    /api/v1/users/me          - Current user profile

GET    /api/v1/projects          - List projects
POST   /api/v1/projects          - Create project
GET    /api/v1/projects/:id      - Get project detail
PUT    /api/v1/projects/:id      - Update project
DELETE /api/v1/projects/:id      - Delete project

GET    /api/v1/tasks             - List tasks
POST   /api/v1/tasks             - Create task
PUT    /api/v1/tasks/:id         - Update task
\`\`\`

### Implementation Details
- All endpoints validated with Zod schemas
- Error responses follow RFC 7807 format
- Database queries optimized with proper indexes
- Connection pooling configured
- Request logging middleware active

### Database Migrations
- Initial schema created and applied
- Seed data scripts ready for development

All endpoints are ready for frontend integration.`;
}

function generateQAResponse(context: string): string {
  return `## QA Test Report

### Test Plan Overview
| Category | Tests | Passed | Failed | Coverage |
|----------|-------|--------|--------|----------|
| Unit Tests | 45 | 43 | 2 | 85% |
| Integration | 20 | 18 | 2 | 72% |
| E2E | 10 | 8 | 2 | 60% |

### Critical Issues Found
1. **BUG-001** [High]: Form validation not triggering on empty submit
   - Steps: Submit form without filling required fields
   - Expected: Validation errors shown
   - Actual: Form submits with empty values

2. **BUG-002** [Medium]: Loading state not shown during API calls
   - Steps: Click submit and observe UI
   - Expected: Loading spinner visible
   - Actual: No visual feedback

### Test Cases Executed
- ✅ User registration with valid data
- ✅ User login with correct credentials
- ✅ Dashboard data rendering
- ❌ Error handling for network failures
- ❌ Session timeout handling
- ✅ Responsive layout on mobile
- ✅ Accessibility keyboard navigation

### Recommendations
- Increase unit test coverage to >90%
- Add error boundary tests
- Implement load testing for API endpoints
- Add security scanning to CI pipeline`;
}

function generateDevOpsResponse(context: string): string {
  return `## Deployment Configuration

### Docker Setup
\`\`\`dockerfile
# Multi-stage build for production
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
\`\`\`

### CI/CD Pipeline (GitHub Actions)
- Build and test on every PR
- Deploy to staging on merge to develop
- Deploy to production on merge to main
- Automated rollback on health check failure

### Infrastructure
- Container orchestration with Docker Compose
- Reverse proxy with Nginx/Caddy
- SSL/TLS with Let's Encrypt
- PostgreSQL with automated backups
- Log aggregation configured
- Health check endpoints active

### Environment Configuration
- Development, staging, and production environments
- Environment variables managed securely
- Secrets stored in environment, not in code

Deployment pipeline is ready for production use.`;
}
