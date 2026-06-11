## Goal
Each day, generate AI-suggested job roles tailored to each student's profile (skills from resume, GPA/department, roadmap target roles, location preferences). New matches surface as:
1. A notification bell badge in the header
2. A dedicated `/jobs` page listing matches with score, filters, "new" badges, and mark-as-read
3. An optional email digest (using the existing `/settings/email` setup)

## Data Model (new tables)

- `job_preferences` — per-student preferences
  - `user_id` (PK, FK auth.users), `work_mode` (remote/hybrid/onsite/any), `locations` (text[]), `min_match_score` (int, default 60), `email_digest` (bool, default true)

- `job_recommendations` — generated matches
  - `id`, `user_id`, `title`, `company`, `location`, `work_mode`, `description`, `required_skills` (text[]), `min_gpa` (numeric, nullable), `match_score` (int 0–100), `match_reasons` (text[]), `source` ('ai'), `created_at`, `seen_at` (nullable), `dismissed_at` (nullable)

- `job_alert_runs` — per-user run audit
  - `id`, `user_id`, `ran_at`, `new_count`, `status`, `error`

RLS: students read/update their own rows; service_role full access. GRANTs included.

## Edge Functions

- `generate-job-recommendations` (callable + cron-invoked)
  - Inputs: optional `user_id`; otherwise iterates all students who have a resume analysis.
  - Pulls latest `resume_analyses` (skills), `profiles` (GPA/dept), `career_roadmaps` (target roles), `job_preferences` (locations/work mode).
  - Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with structured output (zod schema) to produce 3–8 fresh role suggestions including title, company (plausible/realistic), location, work_mode, required_skills, match_score, match_reasons.
  - Dedupes against existing recommendations from the last 30 days (title+company).
  - Inserts new rows and, if `email_digest` is on and new_count > 0, invokes `send-transactional-email` with a `job-recommendations-digest` template.
  - Writes a `job_alert_runs` row.

- Reuse `send-transactional-email` (already scaffolded via the email pipeline) — add a new React Email template `job-recommendations-digest` listing top matches with CTA → `/jobs`.

## Scheduling
Use pg_cron + pg_net to invoke `generate-job-recommendations` daily at 08:00 UTC (no user payload → iterates all eligible students). Inserted via the data-insert tool (not migration) since URL/anon key are project-specific.

## Frontend

- `src/pages/JobAlerts.tsx` at route `/jobs`
  - Lists recommendations sorted by `match_score`. Filter chips: All / Unseen / Dismissed. Per-card: title, company, location, work_mode badge, match score ring, "why this matches" reasons, Mark seen / Dismiss actions, "Run now" button (invokes edge function for current user).
  - Top-of-page **Preferences** card: work mode select, locations chips, min match score slider, email digest toggle → writes to `job_preferences`.

- `src/components/NotificationBell.tsx` in `AppHeader`
  - Subscribes via Supabase Realtime to `job_recommendations` for `auth.uid()` where `seen_at is null`.
  - Shows unread count badge; dropdown lists 5 most recent unseen with link to `/jobs`.

- Route added in `App.tsx` (protected). Nav link in `AppHeader`.

## Match Criteria (server-side scoring guidance passed to AI)
Score weights: skills overlap 50, target-role alignment 25, GPA/department fit 15, location/work-mode fit 10. AI returns final 0–100 score + reasons.

## Email Prerequisites
The project already has email settings UI. If email infrastructure isn't fully set up yet, the digest send will fail gracefully (try/catch) and the rest of the flow still works — user can finish email domain setup separately.

## Out of scope (this iteration)
- Applying to jobs / external job board sync
- Per-user OAuth to job APIs
- Admin curation UI

## Files
- New migration: `job_preferences`, `job_recommendations`, `job_alert_runs` + RLS + realtime publication add
- New edge function: `supabase/functions/generate-job-recommendations/index.ts`
- New email template: `supabase/functions/_shared/transactional-email-templates/job-recommendations-digest.tsx` + registry update
- New pages/components: `src/pages/JobAlerts.tsx`, `src/components/NotificationBell.tsx`
- Edits: `src/App.tsx` (route), `src/components/AppHeader.tsx` (bell + nav link)
- pg_cron schedule via insert tool

Approve and I'll build it end-to-end.