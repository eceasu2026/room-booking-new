# ASU Conference Hall Booking System — Implementation Plan

An enterprise-grade, institutional multi-department conference hall booking platform built for Assam Skill University (ASU), delivering seamless self-service reservations with automatic conflict-free confirmation, transactional concurrency protection, Google Material Design 3 aesthetics, and turnkey Windows 11 host deployment.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were aligned during Phase 1 clarification:
> - **Initial Departments**: Pre-configured with **Computer Science**, **Mechanical Engineering**, and **Electrical Engineering**, with administrator ability to add additional departments at any time.
> - **Booking Confirmation Workflow**: **Strict Automatic Instant Confirmation** ("no admin just booking"). When a requested slot is conflict-free and within permitted hours, the system immediately locks the database transaction, inserts the booking as `CONFIRMED`, assigns an institutional booking ID, and issues instant in-app confirmation notifications without manual administrative gates.
> - **First-Run Experience**: A **Guided First-Run Setup Wizard** launches automatically on initial startup if no administrator account exists, walking the authorized university installer through administrator credential creation, hall specifications, operating hours, and initial department setup.

---

## 1. Overview & Core Concept

Assam Skill University requires a unified, central conference hall reservation portal accessible across campus networks and departments. Historically, multi-department booking leads to double-booking disputes, email bottlenecks, and administrative delay.

The **ASU Conference Hall Booking System** resolves this by providing:
- **Instantaneous Availability & Confirmation**: Departments select any flexible start and end time. If the hall is available, the reservation is confirmed automatically in real-time.
- **Strict Concurrency & Overlap Prevention**: Backend database transactions enforce mathematical non-overlapping intervals (`new_start < existing_end AND new_end > existing_start`) under write locks, guaranteeing zero double-bookings even during simultaneous submissions.
- **Institutional Access & RBAC**: Department users access their dedicated booking portal and schedule, while University Administrators manage halls, emergency closures, user accounts, and generate audit-ready usage reports.
- **Institutional Material Design 3**: A clean, accessible, university-standard visual language honoring Material 3 surface elevation, readable typography, and zero-clutter information architecture.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[First Launch] ──▶ [Guided Setup Wizard] ──▶ [Create Admin & Seed 3 ASU Departments]
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
   [Department User]                 [Administrator]
         │                                 │
         ├─▶ Dashboard (Today / Next Event)├─▶ University Metrics & Daily Schedule
         ├─▶ Check Availability & Book     ├─▶ Hall Settings & Emergency Closures
         │   (Automatic Instant Confirmed) ├─▶ User & Department Management
         ├─▶ Interactive Calendar (Month/  ├─▶ Audit Logs & Excel/CSV Reports
         │   Week/Day/Timeline)            └─▶ Cancel / Override with Reason
         ├─▶ My Bookings & Print Voucher
         └─▶ In-App Notifications
```

1. **First-Run Setup Flow**: When first accessed, the system detects an uninitialized database and displays a 4-step wizard:
   - Step 1: Institutional Administrator account setup (username, display name, secure password).
   - Step 2: Conference Hall details (Hall Name, location, capacity, audiovisual facilities, timezone `Asia/Kolkata`).
   - Step 3: Operating rules (permitted hours e.g., 08:00–20:00, advance booking horizon, minimum notice, transition buffer).
   - Step 4: Seed initial departments (Computer Science, Mechanical Engineering, Electrical Engineering) with generated access credentials.
2. **Department Booking Flow**:
   - User navigates to **Book Hall**. Department is automatically locked to user's assigned department.
   - User picks date, start time, end time, organizer name, purpose, participant count, and special arrangements.
   - User clicks **Check Availability**: Immediate visual feedback confirms slot viability or displays exact conflict times.
   - User clicks **Confirm Booking**: System commits transaction and displays the **Official ASU Booking Confirmation Voucher** with unique alphanumeric code (e.g. `ASU-CONF-2026-8812`), downloadable and printable.
3. **Interactive Calendar Flow**:
   - Multi-view calendar (Monthly grid, Weekly schedule, Daily timeline, and Agenda list).
   - Real-time display of confirmed bookings, maintenance closures, and current time indicator in `Asia/Kolkata`.
   - Clicking any open timeslot pre-fills the booking form.
4. **Cancellation Flow**:
   - Department users or administrators can cancel eligible reservations with mandatory cancellation reason.
   - Status updates instantly to `CANCELLED`, freeing the slot immediately for others.
5. **Admin Management & Reporting Flow**:
   - Filterable reports by department, date range, and peak utilization hours.
   - One-click CSV export compatible with Microsoft Excel, featuring formula-injection protection.

### Visual Identity & Theme (Material Design 3)

- **Color Palette**:
  - Dominant Neutral Canvas (60%): `#F8FAFC` (Slate 50) light canvas / `#0F172A` (Slate 900) dark canvas.
  - Structural Surfaces (30%): Clean `#FFFFFF` elevated cards with 1px hairline border (`#E2E8F0`), M3 surface tonal elevations (Level 1: 1px soft shadow, Level 2 for active modals).
  - Primary Institutional Accent (10%): ASU Navy Blue (`#1E3A8A` / `#2563EB`) representing academic trust, paired with Emerald Green (`#059669`) for confirmed slots, Amber (`#D97706`) for maintenance/closures, and Rose (`#DC2626`) for conflicts/cancellations.
- **Typography & Hierarchy**:
  - Primary UI & Display: `Plus Jakarta Sans` / `Roboto` (500 medium headers, 600 bold titles).
  - Tabular Figures: `tabular-nums font-mono` for all dates, times, durations, participant counts, and booking codes.
  - Zero-Pill Metadata Rule: Informational metadata (dates, departments, codes) rendered as clean unboxed inline text separated by subtle middots (`·`).
- **Top Bar & Shell Contract**:
  - Desktop: Left navigation drawer (collapsible), Top application bar with University brand mark, current user profile, unread notification bell with live counter badge.
  - Mobile: Drawer transforms to off-canvas responsive drawer with touch-friendly 44px hit targets.

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Rationale & Alternatives |
| :--- | :--- | :--- |
| **Booking Policy** | **Strict Automatic Confirmation** | Removes bureaucracy; conference hall is booked instantly if free. Concurrency handled by backend ACID transactions. |
| **Data Persistence** | **Embedded SQLite with Abstraction Layer** | Zero configuration required on the Windows 11 host PC. High-speed file-based database with `WAL` mode and `BEGIN IMMEDIATE` locks. DB service interface allows seamless PostgreSQL migration later. |
| **Concurrency Model** | **BEGIN IMMEDIATE + Mathematical Interval Check** | In SQLite, `BEGIN IMMEDIATE` acquires a reserved write lock at transaction start, preventing race conditions when two users submit overlapping slots simultaneously. |
| **Idempotency** | **Client Idempotency Key Header** | Prevents duplicate bookings from rapid double-clicks or unstable networks by caching response per idempotency token. |
| **Deployment Model** | **Self-Contained Windows 11 Bundle** | Includes Node.js Express server serving production static Vite assets + REST API, accompanied by Windows Batch/PowerShell scripts, Task Scheduler XML, and backup scripts. |

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client Browser (React 19)                       │
│  ┌──────────────────┐  ┌───────────────────┐  ┌─────────────────────┐  │
│  │ Material 3 Shell │  │  Dashboard & Cal  │  │ Booking Form & Avail│  │
│  │ (Nav Drawer/Bar) │  │  (Month/Week/Day) │  │ (Instant Confirmed) │  │
│  └────────┬─────────┘  └─────────┬─────────┘  └──────────┬──────────┘  │
│           │                      │                       │             │
│           └──────────────────────┼───────────────────────┘             │
│                                  ▼                                     │
│                     API Client Service (Axios/Fetch)                   │
│                     (Session Cookies & Idempotency)                    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP REST /api/v1/*
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Express Full-Stack Server (Node.js)                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Middleware: Session Auth, Rate Limiter, CSRF, Role Authorization │  │
│  └───────────────────────────────┬──────────────────────────────────┘  │
│                                  │                                     │
│  ┌───────────────────────────────┴──────────────────────────────────┐  │
│  │ API Controllers: /auth, /bookings, /departments, /closures, etc. │  │
│  └───────────────────────────────┬──────────────────────────────────┘  │
│                                  │                                     │
│  ┌───────────────────────────────┴──────────────────────────────────┐  │
│  │ Booking Transaction Service:                                     │  │
│  │ - Lock with BEGIN IMMEDIATE                                      │  │
│  │ - Evaluate: (new_start < existing_end AND new_end > existing_st) │  │
│  │ - Insert CONFIRMED or Return 409 Conflict                        │  │
│  └───────────────────────────────┬──────────────────────────────────┘  │
│                                  ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Database Layer (SQLite with WAL mode, parameterized queries)     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
             ┌───────────────────────────────────────────┐
             │ Host Storage: /data/asu_conference.sqlite │
             └───────────────────────────────────────────┘
```

### Relational Schema (SQLite)

- **`departments`**: `id` (TEXT PK), `name` (TEXT), `code` (TEXT UNIQUE), `is_active` (INT), `created_at` (TEXT), `updated_at` (TEXT).
- **`users`**: `id` (TEXT PK), `username` (TEXT UNIQUE), `display_name` (TEXT), `password_hash` (TEXT), `role` (`admin` | `department_user`), `department_id` (FK), `is_active` (INT), `must_change_password` (INT), `created_at`, `last_login_at`.
- **`halls`**: `id` (TEXT PK), `name` (TEXT), `location` (TEXT), `capacity` (INT), `facilities_json` (TEXT), `opening_time` (TEXT), `closing_time` (TEXT), `min_notice_hours` (INT), `max_duration_hours` (INT), `buffer_minutes` (INT), `is_active` (INT).
- **`bookings`**: `id` (TEXT PK), `booking_code` (TEXT UNIQUE), `hall_id` (FK), `department_id` (FK), `user_id` (FK), `event_title` (TEXT), `organizer_name` (TEXT), `contact_number` (TEXT), `purpose` (TEXT), `participant_count` (INT), `start_at` (TEXT ISO8601), `end_at` (TEXT ISO8601), `remarks` (TEXT), `status` (`CONFIRMED` | `CANCELLED`), `cancellation_reason` (TEXT), `cancelled_by` (FK), `cancelled_at` (TEXT), `created_at` (TEXT).
- **`closures`**: `id` (TEXT PK), `hall_id` (FK), `start_at` (TEXT), `end_at` (TEXT), `reason` (TEXT), `created_by` (FK), `created_at` (TEXT).
- **`notifications`**: `id` (TEXT PK), `recipient_user_id` (FK), `type` (TEXT), `title` (TEXT), `message` (TEXT), `related_booking_id` (FK), `is_read` (INT), `created_at` (TEXT), `read_at` (TEXT).
- **`audit_logs`**: `id` (TEXT PK), `actor_user_id` (FK), `action` (TEXT), `entity_type` (TEXT), `entity_id` (TEXT), `details_json` (TEXT), `created_at` (TEXT).
- **`app_settings`**: `key` (TEXT PK), `value` (TEXT), `updated_at` (TEXT).
- **`idempotency_keys`**: `id` (TEXT PK), `user_id` (FK), `idempotency_key` (TEXT UNIQUE), `request_hash` (TEXT), `response_json` (TEXT), `created_at` (TEXT), `expires_at` (TEXT).

---

## 5. Implementation Sequence & Deliverables

1. **Step 1: Database Engine & Abstraction (`src/server/db/`)**
   - SQLite database initialization with schema migrations and seed scripts.
   - Transactional wrapper supporting `BEGIN IMMEDIATE` for zero double-booking concurrency.
2. **Step 2: Express Server & REST API (`src/server/`)**
   - Session authentication, bcrypt password hashing, role-based authorization.
   - Booking engine with availability checking, instant confirmation, cancellation, and idempotency cache.
   - Notification service, department management, user management, hall closures, and audit logging.
   - Reports engine with formula-safe CSV export.
   - Vite dev integration middleware to execute full-stack live in dev environment on port 3000.
3. **Step 3: Frontend Foundation & Design System (`src/components/`, `src/theme/`)**
   - Material Design 3 shell, responsive left navigation drawer, top bar with live notification drawer.
   - First-run setup wizard modal/screen for initial university administrator initialization.
   - Auth state context, login screen, password-change dialog.
4. **Step 4: Booking Experience & Real-Time Availability (`src/pages/book/`)**
   - Flexible date & time selector with duration preview.
   - Real-time availability checker displaying conflict periods.
   - One-click automatic submission with instant confirmation modal and printable voucher.
5. **Step 5: Interactive Calendar & My Bookings (`src/pages/calendar/`, `src/pages/bookings/`)**
   - Month, Week, Day, and Agenda timeline views.
   - My Bookings table with search, status filters, cancellation dialog, and PDF/print action.
6. **Step 6: Administrator Suite (`src/pages/admin/`)**
   - Department management (add, edit, deactivate).
   - User management (create user, assign department, reset password).
   - Hall settings & maintenance closure manager with conflict warning.
   - Usage reports with charts and Excel-compatible CSV export.
   - Audit logs explorer.
7. **Step 7: Windows 11 Deployment & Backup Package (`/deployment/`)**
   - Standalone `server.ts` production runner.
   - Windows startup scripts (`start-asu-booking.bat`, `stop-asu-booking.bat`).
   - Windows Task Scheduler XML configuration for auto-start on boot.
   - Automated database backup script (`backup-db.ps1`) with rotation.
   - Comprehensive Windows 11 installation and remote access guide (VPN/HTTPS tunneling).
