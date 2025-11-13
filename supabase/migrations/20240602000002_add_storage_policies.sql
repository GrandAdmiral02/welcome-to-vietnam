-- Helper function to extract match_id from storage object path (e.g., "{match_id}/file.png")
CREATE OR REPLACE FUNCTION get_match_id_from_path(path_name text)
RETURNS uuid AS $$
DECLARE
  match_id_text text;
BEGIN
  match_id_text := split_part(path_name, '/', 1);
  RETURN match_id_text::uuid;
EXCEPTION WHEN others THEN
  -- Return a random UUID on parse error to ensure the subsequent check fails safely
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- RLS Policy: Allow users to UPLOAD to the 'message_attachments' bucket 
-- if they are a member of the match corresponding to the upload path.
CREATE POLICY "Enable insert for users in conversation"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'message_attachments' AND
    auth.uid() IN (
        SELECT user1_id FROM public.matches WHERE id = get_match_id_from_path(name)
        UNION ALL
        SELECT user2_id FROM public.matches WHERE id = get_match_id_from_path(name)
    )
);

-- RLS Policy: Allow users to SELECT from the 'message_attachments' bucket 
-- if they are a member of the match corresponding to the file path.
CREATE POLICY "Enable read for users in conversation"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'message_attachments' AND
    auth.uid() IN (
        SELECT user1_id FROM public.matches WHERE id = get_match_id_from_path(name)
        UNION ALL
        SELECT user2_id FROM public.matches WHERE id = get_match_id_from_path(name)
    )
);
