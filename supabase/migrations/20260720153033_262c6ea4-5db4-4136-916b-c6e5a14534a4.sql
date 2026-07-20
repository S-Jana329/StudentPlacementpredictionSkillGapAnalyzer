
CREATE TABLE public.job_match_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_recommendation_id UUID NOT NULL REFERENCES public.job_recommendations(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('mark_seen','mark_unseen','dismiss','undismiss')),
  previous_status TEXT NOT NULL CHECK (previous_status IN ('new','seen','dismissed')),
  new_status TEXT NOT NULL CHECK (new_status IN ('new','seen','dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_match_audit_log_created_at ON public.job_match_audit_log (created_at DESC);
CREATE INDEX idx_job_match_audit_log_job_rec ON public.job_match_audit_log (job_recommendation_id);
CREATE INDEX idx_job_match_audit_log_admin ON public.job_match_audit_log (admin_user_id);

GRANT SELECT, INSERT ON public.job_match_audit_log TO authenticated;
GRANT ALL ON public.job_match_audit_log TO service_role;

ALTER TABLE public.job_match_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.job_match_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log"
  ON public.job_match_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND admin_user_id = auth.uid()
  );
