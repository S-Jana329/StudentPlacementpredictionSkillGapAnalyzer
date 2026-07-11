-- Replace public-role policies with authenticated-only, owner-scoped policies
DROP POLICY IF EXISTS "Users view own job recommendations" ON public.job_recommendations;
DROP POLICY IF EXISTS "Users update own job recommendations" ON public.job_recommendations;
DROP POLICY IF EXISTS "Users delete own job recommendations" ON public.job_recommendations;

CREATE POLICY "Authenticated users view own job recommendations"
  ON public.job_recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users update own job recommendations"
  ON public.job_recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users delete own job recommendations"
  ON public.job_recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Explicitly block inserts from clients (only service_role edge function writes)
CREATE POLICY "No client inserts on job recommendations"
  ON public.job_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Explicitly block anon from any access (defense in depth for realtime)
REVOKE ALL ON public.job_recommendations FROM anon;

-- Ensure realtime payloads include full row so RLS can be enforced on changes
ALTER TABLE public.job_recommendations REPLICA IDENTITY FULL;