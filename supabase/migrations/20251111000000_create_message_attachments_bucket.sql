-- 1. Create Storage Bucket
-- Creates a new, non-public bucket for storing images sent in messages.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('message_attachments', 'message_attachments', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Drop Existing Policies (for idempotency)
-- Ensures that the script can be re-run without errors by removing old policies first.
DROP POLICY IF EXISTS "Allow read access to conversation members" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert access to conversation members" ON storage.objects;

-- 3. Create SELECT Policy
-- Allows users to view images if they are a member of the conversation (match).
CREATE POLICY "Allow read access to conversation members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message_attachments' AND
  EXISTS (
    SELECT 1
    FROM public.matches
    WHERE public.matches.id = (string_to_array(storage.objects.name, '/'))[1]::uuid
      AND (public.matches.user1_id = auth.uid() OR public.matches.user2_id = auth.uid())
  )
);

-- 4. Create INSERT Policy
-- Allows users to upload images if they are a member of the conversation (match).
CREATE POLICY "Allow insert access to conversation members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message_attachments' AND
  EXISTS (
    SELECT 1
    FROM public.matches
    WHERE public.matches.id = (string_to_array(storage.objects.name, '/'))[1]::uuid
      AND (public.matches.user1_id = auth.uid() OR public.matches.user2_id = auth.uid())
  )
);
