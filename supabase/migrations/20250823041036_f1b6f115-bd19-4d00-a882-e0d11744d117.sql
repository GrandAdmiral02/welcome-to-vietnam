-- Fix critical security issue: restrict profile visibility for dating app
-- Remove the overly permissive policy that allows viewing all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more secure policy that implements basic dating app privacy
-- Users can only see profiles where:
-- 1. It's not their own profile (prevent self-viewing)
-- 2. Both users are within a reasonable age range of each other (+/- 15 years)
-- 3. The profile has basic required information filled out
CREATE POLICY "Users can view potential matches only" 
ON public.profiles 
FOR SELECT 
USING (
  -- Not the user's own profile
  auth.uid() != user_id 
  AND 
  -- Both users have age information
  age IS NOT NULL 
  AND 
  (SELECT age FROM public.profiles WHERE user_id = auth.uid()) IS NOT NULL
  AND
  -- Age difference is within reasonable range (15 years)
  ABS(age - (SELECT age FROM public.profiles WHERE user_id = auth.uid())) <= 15
  AND
  -- Profile has minimum required information
  full_name IS NOT NULL 
  AND 
  bio IS NOT NULL
);

-- Add a policy for users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);