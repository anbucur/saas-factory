# Family Chronicles

## 1. Concept & Vision

I want to create like a family blog where family memenbers can create blog posts and cover image related to the content are gnerated on the fly using ai , there should be like comment reply to comment functiuonality , and share posts Built with speed, clarity, and usability as core principles. The experience feels fast, focused, and trustworthy — no clutter, no confusion.

## 2. Design Language

### Colors
- **Primary:** #4F46E5 (Indigo 600)
- **Secondary:** #0EA5E9 (Sky 500)
- **Accent:** #10B981 (Emerald 500)
- **Background:** #FAFAFA
- **Surface:** #FFFFFF
- **Text Primary:** #111827
- **Text Secondary:** #6B7280
- **Error:** #EF4444
- **Warning:** #F59E0B
- **Success:** #22C55E

### Typography
- **Headings:** Inter (700, 600)
- **Body:** Inter (400, 500)
- **Mono:** JetBrains Mono (for code/technical content)

### Spacing
- Base unit: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64px

## 3. Layout & Structure

### Pages
- **Dashboard** — Main hub, key metrics, recent activity
- **Settings** — User and workspace configuration

### Navigation
- Left sidebar (collapsible) with main sections
- Top bar with search, notifications, user menu

## 4. Features & Interactions



## 5. Component Inventory

| Component | States | Notes |
|-----------|--------|-------|
| Button | default, hover, active, disabled, loading | Primary/secondary/ghost variants |
| Input | default, focus, error, disabled | With label and helper text |
| Card | default, hover | Elevated surface |
| Badge | info, success, warning, error | For status indicators |
| Modal | open, closing | Backdrop + centered content |
| Toast | info, success, warning, error | Auto-dismiss after 5s |

## 6. Technical Approach

### Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **State:** React hooks (useState, useReducer)
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod

### Architecture
- Feature-based folder structure
- Shared components in `/components/ui`
- Feature modules in `/features/{name}`
- API calls via typed fetch wrappers

### File Structure
```
family-chronicles/
├── SPEC.md
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   └── pages/
│       ├── Dashboard.tsx
│       └── Settings.tsx
```
