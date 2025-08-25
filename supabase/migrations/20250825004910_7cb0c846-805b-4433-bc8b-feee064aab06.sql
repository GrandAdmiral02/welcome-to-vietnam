-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_age()
RETURNS integer AS $$
  SELECT age FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_user_profile_complete()
RETURNS boolean AS $$
  SELECT (age IS NOT NULL AND full_name IS NOT NULL AND bio IS NOT NULL)
  FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_target_profile_complete(target_user_id uuid)
RETURNS boolean AS $$
  SELECT (age IS NOT NULL AND full_name IS NOT NULL AND bio IS NOT NULL)
  FROM public.profiles WHERE user_id = target_user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view potential matches only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view potential match photos" ON public.photos;

-- Create new policies using security definer functions
CREATE POLICY "Users can view potential matches only"
ON public.profiles
FOR SELECT
USING (
  auth.uid() <> user_id 
  AND age IS NOT NULL 
  AND public.get_current_user_age() IS NOT NULL
  AND abs(age - public.get_current_user_age()) <= 15
  AND full_name IS NOT NULL 
  AND bio IS NOT NULL
);

CREATE POLICY "Users can view potential match photos"
ON public.photos
FOR SELECT
USING (
  auth.uid() <> user_id 
  AND public.is_target_profile_complete(user_id)
  AND public.get_current_user_age() IS NOT NULL
  AND public.is_user_profile_complete()
  AND (
    SELECT abs(p1.age - p2.age) <= 15
    FROM profiles p1, profiles p2 
    WHERE p1.user_id = auth.uid() AND p2.user_id = photos.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM matches 
    WHERE status = 'matched' 
    AND (
      (user1_id = auth.uid() AND user2_id = photos.user_id) OR 
      (user2_id = auth.uid() AND user1_id = photos.user_id)
    )
  )
);