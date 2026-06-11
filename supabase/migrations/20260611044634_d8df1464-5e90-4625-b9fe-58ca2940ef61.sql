
-- job_preferences
CREATE TABLE public.job_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  work_mode TEXT NOT NULL DEFAULT 'any' CHECK (work_mode IN ('remote','hybrid','onsite','any')),
  locations TEXT[] NOT NULL DEFAULT '{}',
  min_match_score INT NOT NULL DEFAULT 60 CHECK (min_match_score BETWEEN 0 AND 100),
  email_digest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_preferences TO authenticated;
GRANT ALL ON public.job_preferences TO service_role;
ALTER TABLE public.job_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own job preferences"
  ON public.job_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER job_preferences_set_updated
  BEFORE UPDATE ON public.job_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- job_recommendations
CREATE TABLE public.job_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  work_mode TEXT CHECK (work_mode IN ('remote','hybrid','onsite')),
  description TEXT,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  min_gpa NUMERIC(3,2),
  match_score INT NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  match_reasons TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'ai',
  seen_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX job_recommendations_user_created_idx
  ON public.job_recommendations (user_id, created_at DESC);
CREATE INDEX job_recommendations_user_unseen_idx
  ON public.job_recommendations (user_id) WHERE seen_at IS NULL AND dismissed_at IS NULL;
GRANT SELECT, UPDATE, DELETE ON public.job_recommendations TO authenticated;
GRANT ALL ON public.job_recommendations TO service_role;
ALTER TABLE public.job_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own job recommendations"
  ON public.job_recommendations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users update own job recommendations"
  ON public.job_recommendations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own job recommendations"
  ON public.job_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- job_alert_runs
CREATE TABLE public.job_alert_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  new_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT
);
CREATE INDEX job_alert_runs_user_ran_idx
  ON public.job_alert_runs (user_id, ran_at DESC);
GRANT SELECT ON public.job_alert_runs TO authenticated;
GRANT ALL ON public.job_alert_runs TO service_role;
ALTER TABLE public.job_alert_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own job alert runs"
  ON public.job_alert_runs FOR SELECT
  USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_recommendations;
ALTER TABLE public.job_recommendations REPLICA IDENTITY FULL;
