-- Create blocked_users table for blocking functionality
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for blocked_users
CREATE POLICY "Users can block others" 
ON public.blocked_users 
FOR INSERT 
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocks" 
ON public.blocked_users 
FOR SELECT 
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others" 
ON public.blocked_users 
FOR DELETE 
USING (auth.uid() = blocker_id);

-- Create reports table for reporting inappropriate behavior
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can report others" 
ON public.reports 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their reports" 
ON public.reports 
FOR SELECT 
USING (auth.uid() = reporter_id);

-- Add age preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN age_preference_min INTEGER DEFAULT 18,
ADD COLUMN age_preference_max INTEGER DEFAULT 65,
ADD COLUMN distance_preference INTEGER DEFAULT 50;

-- Create user_preferences table for advanced filtering
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  show_age BOOLEAN DEFAULT true,
  show_distance BOOLEAN DEFAULT true,
  show_last_active BOOLEAN DEFAULT false,
  only_show_verified BOOLEAN DEFAULT false,
  hide_profile_from_feed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for user_preferences timestamps
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update profiles view policies to exclude blocked users
DROP POLICY "Users can view potential matches only" ON public.profiles;

CREATE POLICY "Users can view potential matches only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() <> user_id 
  AND age IS NOT NULL 
  AND get_current_user_age() IS NOT NULL 
  AND full_name IS NOT NULL 
  AND bio IS NOT NULL
  -- Exclude blocked users
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users 
    WHERE blocker_id = auth.uid() AND blocked_id = user_id
  )
  -- Exclude users who blocked current user
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users 
    WHERE blocker_id = user_id AND blocked_id = auth.uid()
  )
);

-- Update photos view policies to exclude blocked users  
DROP POLICY "Users can view potential match photos" ON public.photos;

CREATE POLICY "Users can view potential match photos" 
ON public.photos 
FOR SELECT 
USING (
  auth.uid() <> user_id 
  AND is_target_profile_complete(user_id) 
  AND get_current_user_age() IS NOT NULL 
  AND is_user_profile_complete() 
  AND (
    SELECT (abs((p1.age - p2.age)) <= 15)
    FROM profiles p1, profiles p2
    WHERE p1.user_id = auth.uid() AND p2.user_id = photos.user_id
  ) 
  AND NOT EXISTS (
    SELECT 1 FROM matches
    WHERE status = 'matched' 
    AND ((user1_id = auth.uid() AND user2_id = photos.user_id) 
         OR (user2_id = auth.uid() AND user1_id = photos.user_id))
  )
  -- Exclude blocked users
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users 
    WHERE blocker_id = auth.uid() AND blocked_id = photos.user_id
  )
  -- Exclude users who blocked current user
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users 
    WHERE blocker_id = photos.user_id AND blocked_id = auth.uid()
  )
);