# Business Requirements Document
## DevOps Control Panel (DCP)
**Version:** 1.1  
**Date:** June 2026  
**Author:** DevOps Team  
**Status:** Active

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 2026 | Initial draft |
| 1.1 | June 2026 | Updated auth decisions, SLA logic, visibility rules, user management |

---

## 1. Executive Summary

DevOps Control Panel (DCP) is an internal web application designed for DevOps engineers to manage, track, and report on their daily operational activities. The system consolidates task logging, deployment management, scheduling, and performance reporting into a single interface — replacing manual tracking via spreadsheets or chat messages.

---

## 2. Problem Statement

DevOps engineers currently have no centralized system to:
- Log and categorize daily operational tasks
- Track change requests and deployment readiness
- Visualize upcoming work on a calendar
- Report on completed work and SLA compliance

This results in lost context, missed deadlines, and inability to report on team performance accurately.

---

## 3. Objectives

- Provide a single system for all daily operational tracking
- Enforce structured data entry (dropdowns, required fields) to enable reporting
- Give managers visibility into team workload and SLA compliance
- Be simple and fast to use — engineers should spend less than 2 minutes logging a task

---

## 4. Scope

### In scope
- Task logging module
- Deployment management module
- Calendar view
- Dashboard and reporting
- User authentication and role management
- Admin user management (create users, reset passwords)

### Out of scope (v1.0)
- Integration with external ticketing systems (Jira, ServiceNow)
- Email/Slack notifications (planned for v1.1)
- Forgot password via email (planned for v1.1)
- Mobile application
- API for external consumers

---

## 5. Users and Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Engineer** | Day-to-day user, logs tasks and deployments | Create, read, update own records |
| **Team Lead** | Reviews team activity and SLA reports | Read all records, update any record, mark deployments as deployed |
| **Admin** | Manages users, system configuration, dropdowns | Full access including user management |

---

## 6. Modules

---

### 6.1 Module 1 — Task Log

**Purpose:** Allow engineers to log every operational task they perform during their shift.

#### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Task type | Dropdown | Yes | Admin-configurable |
| Requestor name | Text | Yes | Free text |
| Priority | Dropdown | Yes | Low / Medium / High / Critical |
| Description | Textarea | No | Free text, max 500 chars |
| Status | Dropdown | Yes | In Progress / Completed / On Hold |
| Start time | Datetime | Yes | Auto-filled, editable |
| End time | Datetime | No | Required when status = Completed |
| Assigned to | Dropdown | Yes | Team member list |

#### Task type options (v1.0, admin-configurable)
- Server access provisioning
- Service restart
- Troubleshooting
- Database work
- UAT deployment
- SIT deployment
- Monitoring response
- Other

#### SLA — Time to Close
- SLA for tasks is measured as **time to close** = end_time − start_time
- No threshold per priority — just duration is tracked and shown
- Displayed on dashboard per engineer and per task type

#### Business Rules
- End time is mandatory when marking a task as Completed
- Engineers can only see their own tasks
- Team Lead and Admin can see all tasks, per engineer (not mixed)
- Tasks older than 24 hours cannot be edited (require admin override)
- Priority = Critical triggers a visual indicator on the dashboard

---

### 6.2 Module 2 — Deployment Manager

**Purpose:** Track all incoming change requests (CRs), their readiness status, and deployment schedule.

#### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| CR number | Text | Yes | Unique, format: CR-XXXXX |
| Requestor | Text | Yes | Free text |
| System | Dropdown | Yes | Admin-configurable |
| Scheduled date | Date/Time | No | Can be set later |
| Release note | File upload | No | PDF or Word, max 10MB |
| Status | Auto-calculated | — | See status logic below |
| Notes | Textarea | No | Free text |

#### System dropdown options (v1.0, admin-configurable)
- Core Banking
- Internet Banking
- Mobile Banking
- Payment Gateway
- HR System
- Other

#### Deployment status logic (auto-calculated)

| Condition | Status |
|-----------|--------|
| CR created, no scheduled date, no release note | Pending |
| Scheduled date set AND release note uploaded | Ready to Deploy |
| Deployment completed by engineer | Deployed |
| Scheduled date passed with no action | Overdue |

#### SLA — Deadline Based
- SLA for deployments is based on the **scheduled date** (deadline)
- Deployed on or before scheduled date = SLA Met ✅
- Deployed after scheduled date = SLA Breached ❌
- Shown on dashboard as met/breached per deployment

#### Business Rules
- CR number must be unique
- Status transitions are automatic based on field completion
- Release notes must be PDF or DOCX format
- Only Team Lead or Admin can mark a deployment as Deployed
- Overdue deployments appear highlighted in red on the dashboard
- All engineers can see all deployments (deployments are team-wide)

---

### 6.3 Module 3 — Calendar

**Purpose:** Visual overview of upcoming deployments and tasks scheduled for the team.

#### Features
- Full monthly/weekly calendar view
- Two event types:
  - **Deployments** — shown in blue, from scheduled dates
  - **Tasks** — shown in green when completed, gray when in progress
- Click any event to open its detail view
- Filter by: engineer, event type, system
- Today highlighted

#### Business Rules
- Calendar is read-only — events managed in their modules
- Past events remain visible for historical reference
- Completed deployments show in teal vs pending in blue

---

### 6.4 Module 4 — Dashboard

**Purpose:** Summary of activity, SLA performance, and deployment health.

#### Widgets

| Widget | Description |
|--------|-------------|
| Tasks completed today | Count of tasks marked Completed today |
| Tasks by type | Breakdown by task type |
| Average time to close | Average task completion time this week |
| Deployments this month | Total / ready / deployed / overdue |
| SLA met vs breached | Deployment SLA compliance rate |
| Overdue CRs | List of CRs past scheduled date |
| Team activity | Tasks per engineer this week |

---

### 6.5 Module 5 — Authentication and User Management

**Purpose:** Secure login and access control.

#### Login Page
- Email + password only
- No public registration — accounts created by admin only
- No "forgot password" on login page (v1.0)
- Account lockout after 5 failed attempts
- JWT token, 8 hour expiry

#### User Management (admin only, inside the app)
- Create new user (name, email, password, role)
- Deactivate/reactivate user
- Reset password for any user (admin sets new password directly)
- Manage dropdown options (task types, systems)

#### Password Reset Flow (v1.0 — admin only)
```
Engineer forgets password
        ↓
Contacts admin
        ↓
Admin goes to User Management → finds user → sets new password
        ↓
Engineer logs in with new password
```

#### Forgot Password via Email (v1.1 — planned)
- "Forgot password?" link on login page
- Sends reset link to registered email
- Requires SMTP configuration

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Page load < 2 seconds on LAN |
| Availability | 99% uptime during business hours |
| Security | HTTPS only, JWT tokens, role-based access |
| Browser support | Chrome, Firefox, Edge (latest versions) |
| Data retention | 12 months of task and deployment history |

---

## 8. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL 16 |
| Auth | JWT + bcrypt |
| Proxy | Nginx |
| Containers | Docker + Docker Compose |
| Deployment | Ansible → QA / Release / Production |
| CI/CD | GitHub Actions (planned) |

---

## 9. Architecture

```
[Browser]
    ↓ HTTP
[Nginx] — serves React build + proxies /api
    ↓
[Node.js Backend] — REST API, auth, business logic
    ↓
[PostgreSQL] — all data
```

---

## 10. Environments

| Environment | Purpose | Deploy trigger |
|-------------|---------|----------------|
| QA | Feature testing | Auto on push to main (planned) |
| Release | Staging / UAT | Manual trigger |
| Production | Live system | Manual approval |

---

## 11. Milestones

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 1 | Project setup + Docker + DB schema | ✅ Done |
| Phase 2 | Backend API — Auth, Tasks, Deployments | ✅ Done |
| Phase 3 | Frontend — Login, routing, auth context | ✅ Done |
| Phase 4 | Frontend — Task Log UI | 🔄 In progress |
| Phase 5 | Frontend — Deployment Manager UI | ⬜ Pending |
| Phase 6 | Frontend — Calendar + Dashboard | ⬜ Pending |
| Phase 7 | Admin — User management | ⬜ Pending |
| Phase 8 | Ansible — Deploy to rel + prod | ⬜ Pending |
| Phase 9 | CI/CD — GitHub Actions | ⬜ Pending |

---

## 12. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| SLA threshold per priority? | Tasks = time to close (no threshold). Deployments = scheduled date as deadline |
| Can engineers see each other's tasks? | No — engineers see own tasks only. Team Lead sees all, per engineer |
| Multiple teams? | One team for now |
| Systems dropdown configurable? | Yes, admin-configurable from day one |
| Public registration on login page? | No — admin creates users inside the app only |
| Forgot password on login page? | Not in v1.0 — admin resets passwords. Email reset planned for v1.1 |

---

*End of Document — v1.1*
