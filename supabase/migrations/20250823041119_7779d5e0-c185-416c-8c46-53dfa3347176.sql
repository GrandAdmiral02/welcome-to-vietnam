-- Fix critical security issue: restrict photo visibility for dating app
-- Remove the overly permissive policy that allows viewing all photos
DROP POLICY IF EXISTS "Users can view all photos" ON public.photos;

-- Create secure policies for photo access

-- 1. Users can view their own photos
CREATE POLICY "Users can view their own photos" 
ON public.photos 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Users can view photos of people they've matched with
CREATE POLICY "Users can view matched users photos" 
ON public.photos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.matches 
    WHERE status = 'matched' 
    AND (
      (user1_id = auth.uid() AND user2_id = photos.user_id) 
      OR 
      (user2_id = auth.uid() AND user1_id = photos.user_id)
    )
  )
);

-- 3. Users can view photos of potential matches (same criteria as profiles)
CREATE POLICY "Users can view potential match photos" 
ON public.photos 
FOR SELECT 
USING (
  -- Not the user's own photos (covered by separate policy)
  auth.uid() != user_id 
  AND
  -- Photo owner has a complete profile with age and bio
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = photos.user_id 
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
  -- Age difference is within reasonable range (15 years)
  EXISTS (
    SELECT 1 FROM public.profiles p1, public.profiles p2
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id = photos.user_id
    AND ABS(p1.age - p2.age) <= 15
  )
  AND
  -- Not already matched (to avoid duplicate access)
  NOT EXISTS (
    SELECT 1 FROM public.matches 
    WHERE status = 'matched' 
    AND (
      (user1_id = auth.uid() AND user2_id = photos.user_id) 
      OR 
      (user2_id = auth.uid() AND user1_id = photos.user_id)
    )
  )
);