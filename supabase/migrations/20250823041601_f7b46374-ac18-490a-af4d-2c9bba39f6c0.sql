-- Create storage bucket for user photos
INSERT INTO storage.buckets (id, name, public) VALUES ('user-photos', 'user-photos', true);

-- Create RLS policies for photo storage
-- Users can upload their own photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own photos
CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view photos from potential matches (same logic as photos table)
CREATE POLICY "Users can view potential match storage photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-photos' 
  AND
  -- Not their own photos (covered by separate policy)
  auth.uid()::text != (storage.foldername(name))[1]
  AND
  -- Photo owner has complete profile
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id::text = (storage.foldername(name))[1]
    AND age IS NOT NULL 
    AND full_name IS NOT NULL 
    AND bio IS NOT NULL
  )
  AND
  -- Current user has age information
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND age IS NOT NULL
  )
  AND
  -- Age difference within range
  EXISTS (
    SELECT 1 FROM public.profiles p1, public.profiles p2
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id::text = (storage.foldername(name))[1]
    AND ABS(p1.age - p2.age) <= 15
  )
);

-- Users can view matched user photos in storage
CREATE POLICY "Users can view matched user storage photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-photos'
  AND
  EXISTS (
    SELECT 1 FROM public.matches 
    WHERE status = 'matched' 
    AND (
      (user1_id = auth.uid() AND user2_id::text = (storage.foldername(name))[1]) 
      OR 
      (user2_id = auth.uid() AND user1_id::text = (storage.foldername(name))[1])
    )
  )
);

-- Users can update their own photos
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);