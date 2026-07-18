
-- Defense-in-depth: RESTRICTIVE policy ensures every SELECT on job_recommendations
-- must be either the row owner or an admin, regardless of other permissive policies.
DROP POLICY IF EXISTS "Restrict job recommendations to owner or admin" ON public.job_recommendations;
CREATE POLICY "Restrict job recommendations to owner or admin"
ON public.job_recommendations
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Revoke any implicit access from anon; only authenticated role may touch this table.
REVOKE ALL ON public.job_recommendations FROM anon;
GRANT SELECT, UPDATE, DELETE ON public.job_recommendations TO authenticated;
GRANT ALL ON public.job_recommendations TO service_role;
