
CREATE TABLE public.email_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_domain TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT 'Placement Predictor',
  from_local_part TEXT NOT NULL DEFAULT 'notifications',
  notify_resume_complete BOOLEAN NOT NULL DEFAULT TRUE,
  notify_roadmap_ready BOOLEAN NOT NULL DEFAULT TRUE,
  notify_interview_feedback BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_settings_domain_chk CHECK (
    sender_domain = '' OR sender_domain ~* '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$'
  ),
  CONSTRAINT email_settings_local_chk CHECK (
    from_local_part ~* '^[a-z0-9._-]+$' AND char_length(from_local_part) <= 64
  ),
  CONSTRAINT email_settings_from_name_chk CHECK (
    char_length(btrim(from_name)) BETWEEN 1 AND 100
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own email settings"
  ON public.email_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own email settings"
  ON public.email_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own email settings"
  ON public.email_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own email settings"
  ON public.email_settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
