-- Moment-of-use creator feedback (extends creator_feedback from 0020)
-- Idempotent — safe to re-run.

alter table public.creator_feedback
  add column if not exists feedback_type text,
  add column if not exists improvement_reason text,
  add column if not exists export_readiness text,
  add column if not exists suggestion_text text;

alter table public.creator_feedback alter column rating drop not null;

alter table public.creator_feedback drop constraint if exists creator_feedback_rating_check;
alter table public.creator_feedback add constraint creator_feedback_rating_check
  check (
    rating is null
    or rating in (
      'excellent', 'good', 'average', 'weak',
      'helpful', 'needs_improvement'
    )
  );

alter table public.creator_feedback drop constraint if exists creator_feedback_feedback_type_check;
alter table public.creator_feedback add constraint creator_feedback_feedback_type_check
  check (
    feedback_type is null
    or feedback_type in ('output_rating', 'export_satisfaction', 'suggestion')
  );

alter table public.creator_feedback drop constraint if exists creator_feedback_improvement_reason_check;
alter table public.creator_feedback add constraint creator_feedback_improvement_reason_check
  check (
    improvement_reason is null
    or improvement_reason in (
      'hook_weak',
      'script_generic',
      'storyboard_unclear',
      'caption_weak',
      'not_my_niche',
      'other'
    )
  );

alter table public.creator_feedback drop constraint if exists creator_feedback_export_readiness_check;
alter table public.creator_feedback add constraint creator_feedback_export_readiness_check
  check (
    export_readiness is null
    or export_readiness in ('used_as_is', 'minor_edits', 'major_edits')
  );

create index if not exists creator_feedback_type_idx
  on public.creator_feedback (feedback_type, created_at desc);

create index if not exists creator_feedback_improvement_idx
  on public.creator_feedback (improvement_reason, created_at desc)
  where improvement_reason is not null;

comment on table public.creator_feedback is
  'Creator feedback: legacy quality ratings, output ratings, export satisfaction, suggestions.';
