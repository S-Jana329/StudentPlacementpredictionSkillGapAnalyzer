
CREATE INDEX IF NOT EXISTS job_recommendations_created_at_desc_idx
  ON public.job_recommendations (created_at DESC);
CREATE INDEX IF NOT EXISTS job_recommendations_unseen_idx
  ON public.job_recommendations (created_at DESC)
  WHERE seen_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS job_recommendations_dismissed_idx
  ON public.job_recommendations (created_at DESC)
  WHERE dismissed_at IS NOT NULL;
