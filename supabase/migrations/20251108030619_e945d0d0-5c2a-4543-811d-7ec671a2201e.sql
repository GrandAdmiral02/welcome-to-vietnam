-- Create storage bucket for user photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-photos',
  'user-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage policies for user photos
CREATE POLICY "Users can view all photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'user-photos');

CREATE POLICY "Users can upload own photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );