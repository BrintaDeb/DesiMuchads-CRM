# THE DESI MUCHADS — ENTERPRISE AGENCY OS & HIGH-CONCURRENCY CRM

An enterprise-grade, high-concurrency operating system and single source of truth for the digital marketing agency **The Desi Muchads**. Engineered to automate the complete agency lifecycle: from high-velocity lead capture and automated proposal generation to DAG-based project workflows, two-tier content approval pipelines, real-time biometric attendance/utilization telemetry, and automated recurring billing with Indian GST splitting.

---

## 1. ARCHITECTURAL PILLARS & CORE CAPABILITIES

```
                                  ┌────────────────────────────────┐
                                  │   Next.js 15 + React 19 UI     │
                                  │ (Swiss Minimalist #09090B Base)│
                                  └───────────────┬────────────────┘
                                                  │ HTTP REST / WebSocket Multiplex
                                                  ▼
                                  ┌────────────────────────────────┐
                                  │      FastAPI ASGI Engine       │
                                  │    Dual-Token JWT & RBAC       │
                                  └───────┬──────────────┬─────────┘
                                          │              │
                   ┌──────────────────────┴──────┐       └─────────────────────┐
                   ▼                             ▼                             ▼
       ┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
       │ PostgreSQL (SQLAlchemy│     │ Redis Caching/PubSub  │     │ Google Gemini AI SDK  │
       │ 2.0 Async + asyncpg)  │     │ Celery Distributed Q  │     │ Standups & Ideation   │
       │ ACID Financials & DAG │     │ SLA & Idle Daemons    │     │ Campaign Briefs       │
       └───────────────────────┘     └───────────────────────┘     └───────────────────────┘
```

### 1. Granular Role-Based Access Control (RBAC) Matrix
* **`SUPER_ADMIN` (Agency Founders):** System override, financial ledgers, agency utilization, and AES-256 vault decryption.
* **`ACCOUNT_MANAGER` (Project Leads):** Sales pipeline control, workflow template instantiation, QA approvals, and client communications.
* **`SPECIALIST` (Designers, Copywriters, Media Buyers):** Assigned task boards, content calendar drops, task-level stopwatch, and live attendance terminal.
* **`CLIENT` (External Stakeholder):** Whitelisted portal view containing active campaign deliverables, 1-click approvals, AES-256 credential submission, and invoice history.

### 2. Autonomous Zero-Touch Client Onboarding Engine
Moving any sales deal to `Contract Signed (Won)` triggers an atomic 5-step pipeline:
1. Converts the Lead record into an active `Client Organization`.
2. Provisions a `Client Portal` account with magic-link credentials.
3. Initializes an encrypted `AES-256 Brand & Credential Vault` for the client to submit ad account access.
4. Instantiates selected **Service Workflow Blueprints** (*Monthly Social Media Retainer*, *Performance Marketing Setup*, *Full-Stack Web Build*) into live projects with pre-assigned tasks and relative SLA deadlines.
5. Generates the initial deposit/retainer invoice with Indian GST (18%) and schedules recurring billing.

### 3. Directed Acyclic Graph (DAG) Task Engine
* Tasks enforce strict upstream prerequisites (`Task B` cannot transition to `Ready` or `In Progress` until `Task A` is marked `Completed`).
* **Cycle Detection:** Topological verification prevents accidental circular dependencies.
* **Dynamic Deadline Cascading:** If an upstream task is delayed, downstream task deadlines automatically shift forward to preserve execution buffers.
* **Automated Task Handoffs (Rule 1):** When a copywriting task is marked `Completed`, downstream design tasks automatically unlock and alert the specialist.

### 4. Two-Tier Content Calendar & Approval Pipeline
* Multi-channel support for Instagram Reels/Carousels, LinkedIn, YouTube, Meta Ads, and Google Ads.
* State machine: `Drafting` → `Internal QA (Manager Review)` → `Client Review (Client Portal)` → `Approved / Scheduled` (or `Revision Requested` with version increment and feedback tracking).

### 5. Smart Attendance Terminal & Capacity Guardrails
* Persistent top-header widget with one-click `Clock In`, `Break`, `Resume`, and `Clock Out`.
* Captures UTC timestamp, local timezone, work mode (`In-Office`, `Remote`, `Client Site`), and IP address.
* **Idle & Auto-Checkout Daemon:** Detects sessions exceeding 12 hours and flags them as `Pending Regularization`.
* **Leave Capacity Guardrail:** Scans for task deadlines falling within an employee's approved leave window and dispatches conflict alerts to Account Managers.

### 6. Swiss Minimalist High-Utility UI/UX
* Ultra-clean monochrome foundation (`#09090B` dark mode base, `#27272A` subtle 1px borders).
* Semantic Status Tokens:
  * `Emerald (#10B981)`: Active / Approved / Clocked-In / Paid
  * `Amber (#F59E0B)`: In Review / Away / Pending Approval / Due Soon
  * `Rose (#F43F5E)`: Blocked / SLA Breached / Overdue / Rejected
  * `Indigo (#6366F1)`: Automation Triggered / System Action
* Global Command Palette (`Cmd + K` / `Ctrl + K`) for instant navigation and action execution in <2 seconds.
* Persistent header displaying live Attendance Timer, Active Task Stopwatch, and Real-Time WebSocket Notification Center.

---

## 2. MONOREPO DIRECTORY STRUCTURE

```
MuchadCRM/
├── docker-compose.yml              # Production container orchestration
├── README.md                       # Master Architecture & Developer Documentation
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt            # FastAPI, SQLAlchemy 2.0, Celery, Redis, Fernet, Gemini
│   ├── alembic.ini                 # Database migration config
│   ├── pytest.ini                  # Async test suite runner
│   ├── .env.example                # Backend environment configuration
│   ├── app/
│   │   ├── main.py                 # FastAPI application factory & seed data loader
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic v2 settings
│   │   │   ├── database.py         # SQLAlchemy 2.0 Async SessionLocal & SQLite fallback
│   │   │   └── security.py         # Dual-Token JWT, Bcrypt hashing, Redis blacklist & RBAC
│   │   ├── models/
│   │   │   ├── enums.py            # StrEnum definitions (Roles, WorkModes, Statuses)
│   │   │   └── models.py           # 12+ PostgreSQL models with strict UUIDs & foreign keys
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic v2 request/response envelope schemas
│   │   ├── services/
│   │   │   ├── vault.py            # Fernet AES-256 Symmetric Credential Vault
│   │   │   ├── dag_engine.py       # DAG task dependency validator & deadline cascading
│   │   │   ├── onboarding.py       # Autonomous Zero-Touch Client Onboarding pipeline
│   │   │   ├── attendance_service.py # Attendance terminal & capacity guardrails
│   │   │   ├── content_service.py  # Two-Tier Content approval state machine
│   │   │   ├── automation_bus.py   # Event-driven agency rules engine (Rules 1-4)
│   │   │   ├── websocket_manager.py # Multiplexed live WebSocket broadcast manager
│   │   │   └── gemini_ai.py        # Google Gemini AI SDK integration
│   │   ├── api/v1/
│   │   │   ├── auth.py             # Dual JWT Login, Token Rotation & Me profile
│   │   │   ├── attendance.py       # Terminal Clock In/Out, Break Toggle, Leaves & Live Board
│   │   │   ├── crm.py              # Sales Deals & Convert-to-Client Onboarding trigger
│   │   │   ├── projects.py         # Projects & Workflow Blueprints
│   │   │   ├── tasks.py            # DAG Task board, transitions & time-logging
│   │   │   ├── content_calendar.py # Content drops & two-tier review actions
│   │   │   ├── master_calendar.py  # Unified 4-layer Master Calendar feed
│   │   │   ├── billing.py          # GST Invoices & Payment settlement
│   │   │   ├── vault.py            # AES-256 secret storage & audited decryption
│   │   │   ├── notifications.py    # Notification center & audit trail
│   │   │   ├── ai.py               # Gemini AI campaign brief & standup digests
│   │   │   └── websocket.py        # Authenticated WebSocket stream
│   │   └── workers/
│   │       ├── celery_app.py       # Celery Beat cron schedule configuration
│   │       └── tasks.py            # SLA escalations, auto-checkout & invoice gating
│   └── tests/
│       └── test_backend.py         # Pytest async test suite (100% pass)
└── frontend/
    ├── package.json                # Next.js 15, React 19, Tailwind, TanStack Query, Zustand
    ├── tsconfig.json
    ├── tailwind.config.ts          # Swiss Minimalist monochrome + semantic agency tokens
    ├── next.config.ts
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx          # Root layout with providers & fonts
    │   │   ├── page.tsx            # Executive Overview Dashboard & Telemetry
    │   │   ├── login/page.tsx      # Dual-Token Login & Demo Role Quick-Select
    │   │   ├── crm/page.tsx        # Sales Pipeline & 1-Click Autonomous Onboarding
    │   │   ├── tasks/page.tsx      # DAG Task Kanban Board & List View
    │   │   ├── content-calendar/page.tsx # Two-Tier Content Approval Pipeline
    │   │   ├── calendar/page.tsx   # 4-Layer Unified Master Calendar
    │   │   ├── attendance/page.tsx # Live Attendance Terminal & Leave Capacity Guardrail
    │   │   ├── billing/page.tsx    # Automated Invoicing with 18% GST splits
    │   │   ├── client-portal/page.tsx # Whitelisted External Client View & Vault Upload
    │   │   └── settings/vault/page.tsx # Encrypted AES-256 Credential Vault
    │   ├── components/layout/
    │   │   ├── Sidebar.tsx         # Collapsible 240px / 64px sidebar
    │   │   ├── TopHeader.tsx       # Live Top Bar with Widgets
    │   │   ├── AttendanceWidget.tsx # Interactive terminal stopwatch widget
    │   │   ├── TaskStopwatch.tsx   # Active task stopwatch widget
    │   │   ├── NotificationCenter.tsx # Event-driven alerts popup
    │   │   └── CommandPalette.tsx  # Native <dialog> Cmd+K search modal
    │   ├── lib/
    │   │   ├── api.ts              # Axios instance with JWT interceptor & refresh retry
    │   │   ├── utils.ts            # Currency (INR) and duration formatters
    │   │   └── websocket.ts        # Real-time WebSocket connection manager
    │   └── stores/
    │       ├── authStore.ts        # Auth & role session state
    │       ├── attendanceStore.ts  # Live terminal stopwatch state
    │       ├── taskTimerStore.ts   # Active task stopwatch state
    │       └── uiStore.ts          # Sidebar & command palette visibility
```

---

## 3. DATABASE RELATIONAL SCHEMA (POSTGRESQL)

The schema enforces strict referential integrity, UUID primary keys, and composite indexes on query paths:

1. **`users`**: `id (UUID)`, `email (Unique, Indexed)`, `password_hash`, `full_name`, `role (ENUM: SUPER_ADMIN, ACCOUNT_MANAGER, SPECIALIST, CLIENT)`, `department`, `hourly_cost`, `weekly_capacity_hours (Default 40)`, `is_active`, `created_at`, `deleted_at`.
2. **`attendance_logs`**: `id`, `user_id (FK users)`, `date`, `clock_in_at`, `clock_out_at`, `break_start_at`, `total_break_seconds`, `net_worked_seconds`, `work_mode (ENUM: IN_OFFICE, REMOTE, CLIENT_SITE)`, `ip_address`, `status (ENUM: ACTIVE, ON_BREAK, COMPLETED, REGULARIZATION_NEEDED)`. Composite index: `(user_id, date)`.
3. **`leave_requests`**: `id`, `user_id (FK users)`, `leave_type (ENUM: CASUAL, SICK, EARNED, UNPAID)`, `start_date`, `end_date`, `reason`, `status (ENUM: PENDING, APPROVED, REJECTED)`, `approved_by_id (FK users)`.
4. **`clients`**: `id`, `company_name (Indexed)`, `industry`, `primary_contact_name`, `contact_email`, `contact_phone`, `retainer_amount`, `billing_cycle_day (1-31)`, `gst_tax_id`, `health_score (0-100)`, `status (ENUM: LEAD, ONBOARDING, ACTIVE, PAUSED, CHURNED)`, `deal_stage (ENUM: LEAD_CAPTURED, DISCOVERY_CALL, AUDIT_STRATEGY, PROPOSAL_SENT, WON, LOST)`, `deal_value`, `last_activity_at`, `account_manager_id (FK users)`.
5. **`client_vault_secrets`**: `id`, `client_id (FK clients)`, `platform_name`, `username`, `encrypted_secret (BYTEA - Fernet AES-256 Symmetric)`, `last_accessed_by_id (FK users)`, `updated_at`.
6. **`workflow_templates` & `workflow_template_steps`**: Blueprint schemas defining sequential step order, relative due offsets (in days), default role assignees, and relative step dependencies.
7. **`projects`**: `id`, `client_id (FK clients)`, `name`, `service_type (ENUM)`, `start_date`, `target_end_date`, `status (ENUM)`, `progress_percentage`.
8. **`tasks`**: `id`, `project_id (FK projects)`, `parent_task_id (FK tasks)`, `depends_on_task_id (FK tasks - DAG Dependency)`, `title`, `description`, `assigned_to_id (FK users)`, `priority (ENUM: LOW, MEDIUM, HIGH, CRITICAL)`, `status (ENUM: BACKLOG, BLOCKED, TODO, IN_PROGRESS, INTERNAL_QA, CLIENT_REVIEW, COMPLETED)`, `estimated_hours`, `logged_hours`, `due_at (Indexed)`, `completed_at`.
9. **`content_calendar_items`**: `id`, `client_id (FK clients)`, `project_id (FK projects)`, `task_id (FK tasks)`, `platform (ENUM: INSTAGRAM, LINKEDIN, YOUTUBE, META_ADS, GOOGLE_ADS, BLOG_SEO)`, `content_type (ENUM: REEL, CAROUSEL, STATIC, VIDEO, ARTICLE, STORY)`, `title`, `caption_copy`, `media_urls (JSONB)`, `scheduled_for (Indexed)`, `approval_status (ENUM: DRAFTING, INTERNAL_QA, CLIENT_REVIEW, APPROVED, REVISION_REQUESTED, PUBLISHED)`, `version_number (Integer)`.
10. **`calendar_events`**: `id`, `title`, `event_type (ENUM: MEETING, DEADLINE, CONTENT_DROP, LEAVE)`, `start_time`, `end_time`, `client_id (FK clients)`, `created_by_id (FK users)`, `meeting_link`.
11. **`invoices`**: `id`, `invoice_number (Unique)`, `client_id (FK clients)`, `subtotal`, `tax_amount (18% GST)`, `total_amount`, `currency (Default INR)`, `status (ENUM: DRAFT, SENT, PAID, OVERDUE)`, `due_date (Indexed)`, `paid_at`, `stripe_payment_intent_id`.
12. **`automation_audit_logs`**: `id`, `trigger_event`, `entity_type`, `entity_id`, `action_taken`, `executed_at`, `status`, `details (JSONB)`.
13. **`notifications`**: `id`, `user_id (FK users)`, `title`, `message`, `category (MENTION, APPROVAL, SLA_WARNING, AUTOMATION)`, `link`, `is_read`.

---

## 4. LOCAL DEVELOPMENT & EXECUTION GUIDE

### Prerequisites
* Python 3.12+
* Node.js v20+ / npm v10+
* Docker & Docker Compose (Optional for full container stack)

### Option A: Local Run (Zero-Config Development)

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```
* Backend API documentation will be available at: `http://localhost:8000/docs`
* Health Check: `http://localhost:8000/health`

#### 2. Run Backend Test Suite
```bash
cd backend
.venv\Scripts\pytest -v
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
* Agency OS Frontend runs at: `http://localhost:3000`

---

### Option B: Production Container Deployment (Docker Compose)
To start PostgreSQL, Redis, Celery Background Workers, Celery Beat Cron Scheduler, FastAPI ASGI Server, and Next.js Frontend with one command:

```bash
docker-compose up --build -d
```

---

## 5. DEMO USER CREDENTIALS (PRE-SEEDED)

The database automatically seeds standard personas for pair-programming and client presentation:

| Persona | Email | Password | Role & Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@desimuchads.com` | `admin123456` | Full override, profit margins, vault decryption |
| **Account Manager** | `manager@desimuchads.com` | `manager123456` | CRM pipelines, QA approvals, task routing |
| **Specialist** | `specialist@desimuchads.com` | `specialist123456` | Scoped task board, time tracker, content drafting |
| **Client Portal** | `client@bombaychaico.com` | `client123456` | Whitelisted portal, 1-click approvals, vault submit |

