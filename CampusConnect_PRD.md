# CampusConnect
## Product Requirements Document (PRD)

**Version:** 1.0
**Type:** College Microproject
**Domain:** SDG 4 (Quality Education) + SDG 10 (Reduced Inequalities)

---

## 1. Overview

CampusConnect is a school-focused collaboration web application for students, teachers, and administrators. It is inspired by Microsoft Teams, but purpose-built for school workflows — classes, assignments, resource sharing, and academic progress — rather than generic business meetings.

**One-line pitch:** *"Microsoft Teams, redesigned for how a school actually runs."*

## 2. Problem Statement

Schools that rely on general-purpose tools (email, WhatsApp groups, generic chat apps, or a bare LMS) end up with class content, assignments, and communication scattered across platforms. This is worst for students who face barriers to being physically present or digitally equipped — exactly the students SDG 10 is concerned with. CampusConnect consolidates class communication, coursework, and resources into one accessible platform, and is designed so that participation doesn't depend on being in the room.

## 3. Goals & Success Criteria

| Goal | Success Metric |
|---|---|
| Unify class communication and coursework in one place | A class's announcements, assignments, resources, and chat all live under one "Class Team" |
| Make participation possible without physical presence | Every class-critical action (submit work, ask a question, get materials) is fully usable asynchronously, no live attendance required |
| Support students with limited connectivity/devices | Core flows (view assignment, submit text/file, read announcement) work on low bandwidth; heavy features degrade gracefully |
| Give teachers a clear view of academic progress | Teacher can see per-student and per-class submission/completion status without leaving the platform |
| Demonstrate full-stack skill range for grading | Auth + roles, real-time-ish messaging, file handling, and a persistence layer, all deliberately scoped for a microproject |

## 4. Target Users & Roles

- **Student:** joins class teams, views announcements/resources, submits assignments, messages classmates/teachers, tracks their own progress.
- **Teacher:** creates/manages a class team, posts announcements and assignments, uploads resources, reviews/grades submissions, sees class-wide progress.
- **Administrator:** creates classes and accounts, assigns teachers to classes, has a school-wide view of activity (not per-message content).

Role-based access control (RBAC) governs what each role can see/do — this is a core requirement, not a stretch feature, since a school tool without role separation isn't credible.

## 5. Core Feature List

### 5.1 Class Teams (the core unit)
- A "Class Team" groups one class's announcements, assignments, resources, and chat.
- Students/teachers belong to one or more Class Teams based on enrollment/assignment.

### 5.2 Announcements / Stream
- Teacher-posted updates visible to the whole class, newest first.
- Read/unread indicator so students can tell what's new since their last visit.

### 5.3 Assignments
- Teacher creates an assignment: title, instructions, due date, optional attached resource.
- Student submits text and/or a file before the due date.
- Teacher sees a submission list per assignment (submitted / missing / late) and can leave a grade + short feedback.
- **This is the feature most directly tied to SDG 4/10** — it's the one flow that must work fully asynchronously and on a slow connection.

### 5.4 Resource Library
- Per-class shared files (notes, slides, readings), organized by class, downloadable.
- Optional low-bandwidth mode: text-first view of resource titles/descriptions before loading heavy files.

### 5.5 Class Chat / Messaging
- Per-class group chat for questions and discussion (not 1:1 DMs — kept in-scope as class-only to bound the project).
- Teacher can pin important messages to the top.

### 5.6 Progress Tracking
- Student view: "my assignments" across all classes, sorted by due date / status.
- Teacher view: per-class completion rate and a simple gradebook (assignment × student grid).

### 5.7 Notifications
- In-app notification center for new announcements, assignments due soon, and new grades — no external push infra required for the microproject scope.

## 6. Added / Improved Features (beyond the original brief)

- **Low-bandwidth mode toggle** — text-first UI, deferred image/file loading — directly reinforces SDG 10's "students who cannot always attend in person" framing by also covering students with limited connectivity.
- **Offline-friendly assignment drafting** — a student can draft a text submission offline (saved locally) and it syncs when back online, instead of losing work.
- **Accessible-by-default UI** — keyboard navigation, sufficient color contrast, and screen-reader-friendly labeling on all core flows (this is a natural SDG 4/10 tie-in, not just a nice-to-have).
- **Simple multilingual UI layer** — swappable string table (English + one additional language) so the platform doesn't assume all users are equally fluent in the primary instruction language.
- **Lightweight admin dashboard** — class creation, teacher assignment, and school-wide activity counts (submissions this week, active classes) without exposing private message content to admins.
- **Due-date digest** — a single "what's due this week across all my classes" view for students, reducing the coordination burden that disproportionately affects students juggling other responsibilities (work, caregiving, unreliable transport).

## 7. Explicitly Out of Scope (for this microproject)

- Live video conferencing (out of scope — the brief explicitly wants a collaboration/coursework platform, not a video meeting clone).
- Native mobile apps (responsive web only).
- Automated plagiarism detection or LMS-grade grading rubrics.
- School-to-school or multi-tenant architecture — single school instance is sufficient for the microproject.

## 8. User Stories

- *As a student who missed class*, I want to see the announcement and assignment for that day so I don't fall behind.
- *As a student with a slow connection*, I want to read and submit an assignment without needing to load heavy media first.
- *As a teacher*, I want one place to post an assignment and see who has and hasn't submitted, without cross-referencing spreadsheets.
- *As an administrator*, I want to create classes and assign teachers without needing to touch individual student accounts.
- *As the developer/evaluator*, I want the SDG 4/10 connection expressed through actual platform decisions (async-first flows, low-bandwidth mode, accessibility) rather than a mission statement on the landing page.

## 9. Constraints

- Must support at least 3 roles (student, teacher, admin) with enforced access control.
- Core assignment submission flow must be usable on a throttled/slow connection.
- Single-school scope; no multi-tenant requirement for this version.

## 10. Suggested Milestones

1. Auth + roles + Class Team data model (no content yet, just structure and permissions).
2. Announcements + Resource Library (read/write for teacher, read for student).
3. Assignments end-to-end (create → submit → grade → view grade).
4. Class chat + notifications.
5. Progress tracking views (student "my work," teacher gradebook, admin dashboard).
6. Low-bandwidth mode, offline draft sync, accessibility + i18n pass.
