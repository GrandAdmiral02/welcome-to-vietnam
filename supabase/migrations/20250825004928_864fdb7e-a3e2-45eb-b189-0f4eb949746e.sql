-- Fix search_path for security definer functions
CREATE OR REPLACE FUNCTION public.get_current_user_age()
RETURNS integer 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT age FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_user_profile_complete()
RETURNS boolean 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT (age IS NOT NULL AND full_name IS NOT NULL AND bio IS NOT NULL)
  FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_target_profile_complete(target_user_id uuid)
RETURNS boolean 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT (age IS NOT NULL AND full_name IS NOT NULL AND bio IS NOT NULL)
  FROM public.profiles WHERE user_id = target_user_id;
$$;