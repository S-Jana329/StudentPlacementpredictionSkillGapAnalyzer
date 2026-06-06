
CREATE TABLE public.career_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_role text NOT NULL,
  current_skills text,
  time_horizon_months integer NOT NULL DEFAULT 6,
  status text NOT NULL DEFAULT 'processing',
  roadmap jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_roadmaps TO authenticated;
GRANT ALL ON public.career_roadmaps TO service_role;

ALTER TABLE public.career_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own roadmaps" ON public.career_roadmaps
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own roadmaps" ON public.career_roadmaps
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own roadmaps" ON public.career_roadmaps
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own roadmaps" ON public.career_roadmaps
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_career_roadmaps_updated_at
  BEFORE UPDATE ON public.career_roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
