-- Update RLS policy to require gender, age, and looking_for
DROP POLICY IF EXISTS "Users can view potential matches only" ON public.profiles;

CREATE POLICY "Users can view potential matches only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() <> user_id AND 
  gender IS NOT NULL AND 
  age IS NOT NULL AND 
  looking_for IS NOT NULL AND
  NOT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = auth.uid() AND blocked_id = profiles.user_id
  ) AND 
  NOT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = profiles.user_id AND blocked_id = auth.uid()
  )
);