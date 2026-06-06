
-- Restrict execution of SECURITY DEFINER has_role to authenticated role only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Add UPDATE policy on storage.objects for the 'resumes' bucket
CREATE POLICY "Users update own resume files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'resumes' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'resumes' AND (auth.uid())::text = (storage.foldername(name))[1]);
