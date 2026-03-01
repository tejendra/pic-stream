# Output formats

Use these structures when writing solution docs, technical design, and work items. Default paths assume a `plan/` directory at project root; use a different path only if the user specifies one.

---

## 1. Solution docs

**Location:** `plan/potential-solutions/` (one markdown file per solution).  
**Naming:** `solution-<letter-or-name>-<short-descriptor>.md` (e.g. `solution-a-express-centric.md`).

### Structure

- **Title:** `# Solution A: <Short name>`
- **One-line summary** (optional): Single sentence describing the approach.
- **Architecture:** Diagram (ASCII, mermaid, or description) and high-level flow (hosting, auth, upload, cron, etc.).
- **Sections by concern:** e.g. Thumbnail/preview handling, security, scaling. Keep solution-specific, not generic.
- **Pros:** Bullet list of advantages.
- **Cons:** Bullet list of tradeoffs or drawbacks.

### Minimal example

```markdown
# Solution A: Single backend + managed DB

One backend owns logic; managed service for DB and files.

## Architecture

[Client] ←→ [API] ←→ [DB]
                ↓
           [Blob storage]

- Hosting: API on Cloud Run; static app on CDN.
- Auth: API issues tokens; no user accounts.

## Pros

- Single codebase; easy to reason about.

## Cons

- Backend must run somewhere; no pure serverless.
```

---

## 2. Technical design

**Location:** `plan/technical-design.md` (single file).

### Structure

- **Title:** `# <Product name> – Technical Design`
- **Stack summary:** Table of layer → technology (frontend, backend, database, storage, hosting, etc.).
- **Sections by domain:** Frontend, Backend, Deployment, Security, etc. Each with:
  - Tooling/libraries
  - Key flows (pages, API endpoints, jobs)
  - Conventions (folder layout, env vars, path rules)
- **API surface:** Table of method, path, auth, description when relevant.

### Minimal example

```markdown
# My App – Technical Design

## 1. Stack summary

| Layer     | Technology        |
|----------|-------------------|
| Frontend | React, Vite, TS   |
| Backend  | Node, Express     |
| Database | Firestore         |

## 2. Frontend

- Build: Vite, TypeScript. Routing: React Router.
- Pages: Landing, Dashboard. API client: fetch to /api/*.

## 3. Backend

- Express, TypeScript. Routes: /api/items (CRUD). Auth: JWT in Authorization header.
```

---

## 3. Work items

**Location:** `plan/work-items.md` (single file).

### Structure

- **Title:** `# <Product name> – Implementation Work Items`
- **Intro:** One sentence that tasks are derived from the chosen technical design.
- **Features:** Each feature is a `## Feature N: <Name>` with a short description. Features can be user-facing or scaffolding (setup, docs, env).
- **User Stories:** Under each feature, a `### User Stories` list. Each story is a numbered item with a clear, testable description. Use format: **N.M** Short imperative description with enough detail to implement and verify (APIs, fields, behavior).
- **One explicit decision per choice:** Do not use "or", "e.g.", "optional", "or equivalent", or "if desired" in stories or acceptance criteria. For every decision (repo structure, technology, API contract, UI behavior), state the single chosen approach so each criterion is verifiable as done or not done.

Apply MoSCoW when useful: mark Must / Should / Could in the feature or story text.

### Minimal example

```markdown
# My App – Implementation Work Items

Tasks derived from the technical design. Each Feature is broken into User Stories that can be implemented and verified independently.

---

## Feature 1: Project setup

Scaffold frontend and backend, add shared config.

### User Stories

#### 1.1 Initialize repo 

**Description**: Initialize repo with `frontend/` and `backend/`. Root package.json with workspaces.

**Acceptance Criteria**:

- [ ] Initialize `frontend` directory
- [ ] Initialize `backend` directory
- [ ] Create root `package.json` with workspaces

#### 1.2 Scaffold frontend

**Description**: Initialize Vite + React + TypeScript, React Router. Proxy /api to backend in dev.

**Acceptance Criteria**:

- [ ] Create `package.json` with Vite, React, Typescript, React Router, axios dependencies
- [ ] Initialize Vite config to run app and build app for production
- [ ] Initialize React with single "Hello World" component
- [ ] Implement React Router

#### 1.3 Scaffold backend

**Description**: Node + Express + TypeScript. Structure: src/index.ts, src/routes/, src/services/. Wire CORS and JSON parser.

**Acceptance Criteria**:

- [ ] Create `package.json` with Node, Express, Typescript, and all other required dependencies
- [ ] Create scaffold for index, routes, and services
- [ ] Implement support for CORS and JSON parser

---

## Feature 2: Items API (Must have)

CRUD API for items with JWT auth.

### User Stories

#### 2.1 Implement API to create new items

**Description**: Create API to create new items.

**Acceptance Criteria**:

- [ ] Implement POST /api/items (auth required) that accepts name and type in the body. 
- [ ] Validate request body
- [ ] Return error payload if validation fails
- [ ] Save item to DB
- [ ] Return id and createdAt if save was successful
- [ ] Return error payload if save was unsuccessful

#### 2.2 Implement API to fetch list of items

**Description**: Create API to get all items

**Acceptance Criteria**:

- [ ] Implement GET /api/items (auth required)
- [ ] Return list of items, sorted by createdAt desc.
```

---

## Checklist before writing

- **Solutions:** One file per solution; include architecture, pros, and cons.
- **Technical design:** One file; stack table plus domains (frontend, backend, deployment, security).
- **Work items:** Features with User Stories; each story has explicit, verifiable acceptance criteria.
