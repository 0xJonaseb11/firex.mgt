# TZW FireEx — Supabase SQL Editor Pack (Examiner)

Run these scripts in **Supabase Dashboard → SQL Editor**. They mirror what the REST API returns and support live demonstration during marking.

## File index

| File | Purpose |
|------|---------|
| `01-views-reporting.sql` | Create views (run once) |
| `02-select-users-and-roles.sql` | Users, roles, staff lists |
| `03-select-extinguishers-inventory.sql` | Fleet CRUD verification |
| `04-select-inspections-workflow.sql` | Scheduling, queue, overdue |
| `05-select-maintenance-history.sql` | Inspector maintenance logs |
| `06-select-notifications.sql` | In-app notification inbox |
| `07-select-compliance-and-reports.sql` | Activity 4 report-style queries |
| `08-setup-seed-users-and-roles.sql` | Demo accounts (admin / inspector / user) |
| `09-update-user-roles.sql` | Promote or change roles on existing users |
| `10-verify-data-integrity.sql` | Counts, orphans, examiner checklist |

## Recommended order for marking

1. `08-setup-seed-users-and-roles.sql` — only if you need fresh demo accounts (see warnings below).
2. `01-views-reporting.sql` — creates views; safe to re-run with `OR REPLACE`.
3. `02` … `07` — **SELECT** queries to show data (no changes).
4. `10-verify-data-integrity.sql` — quick health check before demo.

## Important notes

- **Passwords:** The app stores **bcrypt** hashes (12 rounds). Seed script uses PostgreSQL `pgcrypto` (`crypt` + `gen_salt('bf', 12)`), compatible with the API login.
- **Preferred registration:** For production-like proof, register via `POST /api/auth/register` and promote roles with `09-update-user-roles.sql`.
- **IDs:** Application uses text KSUIDs; seeds use readable IDs (`usr_demo_admin`, etc.) for examiner clarity.
- **Roles:** Enum `user_role` = `user` \| `inspector` \| `admin`. RBAC is enforced in the API, not Postgres RLS (exam monolith).

## Demo passwords (seed file only — change after exam)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin.demo@tzw.local` | `TzwAdmin2026!` |
| Inspector | `inspector.demo@tzw.local` | `TzwInspector2026!` |
| User | `user.demo@tzw.local` | `TzwUser2026!` |

After seeding, sign in at http://localhost:5173/login with these credentials.
