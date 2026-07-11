CREATE POLICY "Admins view all job recommendations"
  ON public.job_recommendations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));