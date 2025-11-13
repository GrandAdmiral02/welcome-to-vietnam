--
-- Fix RLS policies for matches and profiles tables
--

-- 1. Policies for 'matches' table

-- Enable RLS on the matches table if it isn't already
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read for users in match" ON public.matches;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.matches;

-- Allow users to see matches they are part of
CREATE POLICY "Enable read for users in match"
ON public.matches
FOR SELECT
TO authenticated
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Allow users to create new matches where they are one of the participants
CREATE POLICY "Enable insert for authenticated users"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- 2. Policies for 'profiles' table

-- Enable RLS on the profiles table if it isn't already
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting old policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "User can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.profiles;

-- Allow any authenticated user to read any profile. 
-- (App logic already handles blocking)
CREATE POLICY "Allow authenticated read access"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "User can update own profile."
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
