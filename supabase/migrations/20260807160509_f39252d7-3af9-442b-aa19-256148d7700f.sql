CREATE TABLE public.auth_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN ('signup', 'password_reset_requested', 'password_reset_completed')),
  email text,
  user_id uuid,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auth_audit_log TO authenticated;
GRANT ALL ON public.auth_audit_log TO service_role;

ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view auth audit log"
ON public.auth_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "No client inserts on auth audit log"
ON public.auth_audit_log
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE INDEX idx_auth_audit_log_created_at ON public.auth_audit_log (created_at DESC);
CREATE INDEX idx_auth_audit_log_event_type ON public.auth_audit_log (event_type, created_at DESC);
CREATE INDEX idx_auth_audit_log_email ON public.auth_audit_log (lower(email));