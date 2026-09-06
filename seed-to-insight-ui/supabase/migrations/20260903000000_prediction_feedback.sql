-- Phase 9 — Human-in-the-Loop (HITL) prediction feedback
-- ============================================================
-- Stores structured human verification of AI predictions
-- (confirmed / corrected / uncertain) as EVALUATION DATA ONLY.
--
-- Scientific boundaries encoded here:
--   * Human feedback is NOT ground truth (no "verified"/"validated" columns).
--   * Feedback never modifies history rows, classifier data, or severity.
--   * No training/label columns: this is an evaluation dataset for a future,
--     human-reviewed improvement workflow — never automatic retraining.
--   * One active verification per (history, user): repeated identical
--     submissions are idempotent; earlier feedback is never silently
--     overwritten (the API rejects changes to an existing record).

create table if not exists public.prediction_feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    history_id uuid references public.history (id) on delete set null,
    ai_prediction text not null,
    ai_confidence double precision,
    ai_reliability text,
    feedback_type text not null
        check (feedback_type in ('confirmed', 'corrected', 'uncertain')),
    human_label text,
    source text not null default 'result_page',
    created_at timestamptz not null default now(),
    constraint human_label_required_for_corrected
        check (feedback_type <> 'corrected' or human_label is not null)
);

create index if not exists idx_prediction_feedback_user
    on public.prediction_feedback (user_id);

create index if not exists idx_prediction_feedback_history
    on public.prediction_feedback (history_id);

-- Idempotency: one active verification per history row per user.
create unique index if not exists uq_prediction_feedback_history_user
    on public.prediction_feedback (history_id, user_id)
    where history_id is not null;

alter table public.prediction_feedback enable row level security;

create policy "Users can insert own prediction feedback"
    on public.prediction_feedback for insert
    with check (auth.uid() = user_id);

create policy "Users can view own prediction feedback"
    on public.prediction_feedback for select
    using (auth.uid() = user_id);
