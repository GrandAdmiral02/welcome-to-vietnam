-- Add new fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('nam', 'nữ')),
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS looking_for_gender text CHECK (looking_for_gender IN ('nam', 'nữ', 'cả hai'));

-- Update looking_for column to be more specific about connection type
COMMENT ON COLUMN public.profiles.looking_for IS 'What type of connection the user is looking for';
COMMENT ON COLUMN public.profiles.looking_for_gender IS 'Gender preference for connections';