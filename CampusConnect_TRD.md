# CampusConnect
## Technical Requirements Document (TRD)

**Version:** 1.0
**Companion to:** CampusConnect_PRD.md

---

## 1. Architecture Overview

CampusConnect is a **client-server web app** with a REST(-ish) API and a relational database, since it needs real accounts, role-based permissions, and durable per-class data — unlike a fully client-only microproject, this one has a legitimate backend requirement (multi-user data that must persist and be access-controlled server-side, not just in one browser's localStorage).

```
/client (React or plain HTML/JS)
├── /pages       → Login, Dashboard, ClassTeam, Assignment, Gradebook, Admin
├── /components  → Stream, ResourceList, ChatPanel, SubmissionForm, NotificationBell
├── /lib         → api.js (fetch wrapper), auth.js (token handling), offlineQueue.js
└── /styles

/server (Node/Express, or Django/Flask — pick one; Node shown below)
├── /routes      → auth, classes, announcements, assignments, submissions, chat, notifications, admin
├── /models      → User, ClassTeam, Announcement, Assignment, Submission, Message, Notification
├── /middleware  → authenticate.js, requireRole.js
└── /db          → migrations, seed data

/db (PostgreSQL or SQLite for the microproject)
```

**Pattern:** standard layered REST API (routes → controllers → models → DB), with role-based middleware gating every route. Chat can be simple polling for a microproject; true WebSockets are a stretch goal (see §7).

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (or vanilla JS if the course scopes it that way) | Component-driven UI maps naturally to Stream/Assignment/Chat panels |
| Backend | Node.js + Express | Fast to scaffold a REST API for a microproject timeline; JSON everywhere |
| Database | PostgreSQL (or SQLite for a purely local/demo build) | Needs real relations: users ↔ classes ↔ assignments ↔ submissions |
| Auth | Session or JWT-based auth, role field on the user record | Simple, standard, sufficient for a single-school scope |
| File storage | Local disk (uploads folder) for the microproject; note S3-compatible storage as the production path | Keeps the microproject deployable without cloud credentials |
| Realtime (chat/notifications) | Short-interval polling (e.g., every 10–15s) for v1; upgrade path to WebSockets/Socket.IO documented but optional | Polling is simpler to implement and demo reliably within microproject time |

## 3. Data Model

### 3.1 Core Entities (simplified ER sketch)

```
User(id, name, email, password_hash, role[student|teacher|admin], language_pref)
ClassTeam(id, name, subject, created_by_teacher_id)
Enrollment(id, user_id, class_team_id, role_in_class[student|teacher])
Announcement(id, class_team_id, author_id, body, created_at)
Assignment(id, class_team_id, title, instructions, due_at, resource_id?)
Submission(id, assignment_id, student_id, text_body?, file_path?, submitted_at, grade?, feedback?)
Resource(id, class_team_id, uploaded_by, title, file_path, description)
Message(id, class_team_id, author_id, body, pinned, created_at)
Notification(id, user_id, type, payload_json, read_at, created_at)
```

- `Enrollment` is the join table that makes "Class Team" membership and per-class role possible (a teacher in one class could theoretically be an aide/student in another, though not required for v1).
- `Submission.grade`/`feedback` being nullable is what distinguishes "submitted, ungraded" from "graded" in the teacher's gradebook view.

### 3.2 Access Control Matrix (enforced server-side, not just hidden in the UI)

| Action | Student | Teacher (own class) | Admin |
|---|---|---|---|
| View class stream/resources | own classes only | own classes | all (read-only) |
| Post announcement | ✗ | ✓ | ✗ |
| Create/grade assignment | ✗ | ✓ | ✗ |
| Submit assignment | own work only | ✗ | ✗ |
| Create class / assign teacher | ✗ | ✗ | ✓ |
| Read chat content | own classes | own classes | ✗ (privacy — admin sees activity counts, not content) |

This matrix is the actual spec for the `requireRole` middleware — every route should map to exactly one row/column combination above.

## 4. Core Systems

### 4.1 Auth & Roles (`middleware/authenticate.js`, `requireRole.js`)
- Standard login → token (JWT or session cookie) → attached to `req.user` on every request.
- `requireRole(['teacher'])` style middleware guards write routes; `requireEnrollment(classTeamId)` guards per-class reads so a student can't fetch another class's data by guessing an ID.

### 4.2 Assignment & Submission Flow
- `POST /classes/:id/assignments` (teacher) → creates assignment.
- `POST /assignments/:id/submissions` (student) → creates/updates their own submission; server rejects submissions after `due_at` unless a "late" flag is explicitly allowed by the teacher.
- `PATCH /submissions/:id` (teacher, own class only) → sets grade/feedback.
- This flow is the one most worth building end-to-end first (per PRD milestones) since it's the clearest SDG 4/10 demonstration.

### 4.3 Low-Bandwidth Mode
- Client-side setting (`localStorage` flag) that:
  - Requests a text-only announcement/resource list first (`?fields=title,description` query param support on the API) before fetching file bytes.
  - Defers image/file rendering behind an explicit "load" tap rather than auto-loading.
- No separate backend needed beyond supporting partial field selection — keeps this a client concern.

### 4.4 Offline Draft Sync
- Assignment submission form writes drafts to `localStorage` (or IndexedDB for larger text) keyed by `assignment_id`.
- On regaining connectivity, `offlineQueue.js` flushes any pending draft via the normal submission endpoint, then clears the local draft.
- Scope note: this covers *drafting* while offline, not full offline-first app behavior (no service-worker asset caching required unless time allows).

### 4.5 Notifications
- Server writes a `Notification` row on: new announcement in an enrolled class, assignment due within 48h (computed via a simple scheduled check or on-login check for the microproject), new grade posted.
- Client polls `/notifications/unread-count` on an interval and on navigation.

### 4.6 Chat (polling-based for v1)
- `GET /classes/:id/messages?since=<timestamp>` polled every 10–15s while the chat panel is open.
- Documented upgrade path: swap polling for Socket.IO rooms keyed by `class_team_id` — noted as a stretch goal, not required for the core grade.

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Security | Passwords hashed (bcrypt/argon2); all class-scoped routes verify enrollment server-side, not just in the UI |
| Performance | Core assignment flow (view, submit) usable on a throttled 3G-equivalent connection profile |
| Accessibility | Keyboard-operable forms, sufficient contrast, `aria-live` on notification updates |
| Privacy | Admin role can see activity counts (submissions/week, active classes) but not private chat/message content |
| Compatibility | Latest 2 versions of Chrome, Firefox, Edge, Safari |
| Data integrity | Submission timestamps and grade edits are server-authoritative (client clock never trusted for due-date enforcement) |

## 6. Testing Plan

- **Unit:** role-middleware access checks (each cell of the access-control matrix), due-date enforcement logic, offline-queue flush logic.
- **Integration:** full assignment lifecycle (create → submit → grade → student views grade) across all three roles.
- **Manual:** low-bandwidth mode walkthrough with network throttling enabled in devtools; keyboard-only navigation pass; screen-reader spot check on the assignment submission form.
- **Security spot-check:** confirm a student account cannot read another class's data by directly calling the API with a guessed/known class ID.

## 7. Risks / Open Technical Questions

- **Realtime chat:** polling is simple but not "real" real-time — flag this explicitly in the write-up as a scoped trade-off, with Socket.IO as the documented upgrade path rather than something attempted under microproject time pressure.
- **File storage scope:** local-disk uploads are fine for a demo but won't survive a redeploy on most free hosting tiers — note this as a known limitation rather than trying to wire up cloud storage credentials under deadline.
- **Scope discipline:** the access-control matrix + assignment flow is the credible core of the SDG 4/10 claim; chat, notifications, and admin dashboard are valuable but should be treated as build-time-permitting, per the PRD milestones.
