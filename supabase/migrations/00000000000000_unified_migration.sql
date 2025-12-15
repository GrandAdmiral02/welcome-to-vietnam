-- Drop existing policies for messages table if they exist
DROP POLICY IF EXISTS "Enable read for users in match" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for users in match" ON public.messages;

-- Create a new, correct policy for SELECT
CREATE POLICY "Enable read for users in match"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM matches
    WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

-- Create a new, correct policy for INSERT
CREATE POLICY "Enable insert for users in match"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM matches
    WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid()) AND messages.sender_id = auth.uid()
  )
);

-- Enable RLS on the messages table if it's not already
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;--
-- Enable Realtime for messages table
--

-- 1. Ensure RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Set replica identity to FULL
-- This is required for RLS to work with realtime broadcasts
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 3. Add the table to the supabase_realtime publication
-- This will start broadcasting changes
-- NOTE: This may fail if the table is already in the publication, which is okay.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END;
$$;
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
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;

-- Giai đoạn 1: Tạo bảng `matches`
CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user1_id uuid NOT NULL,
    user2_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT matches_pkey PRIMARY KEY (id),
    CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Giai đoạn 2: Tạo bảng `messages`
CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'text'::text NOT NULL,
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE,
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- Giai đoạn 3: Chính sách Bảo mật (RLS) cho `matches`
-- Cho phép người dùng tạo match mới nếu họ là một trong hai người tham gia.
CREATE POLICY "Enable insert for authenticated users" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
-- Cho phép người dùng đọc các match mà họ là thành viên.
CREATE POLICY "Enable read for users in match" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);


-- Giai đoạn 4: Chính sách Bảo mật (RLS) cho `messages`
-- Cho phép người dùng đọc tin nhắn trong các cuộc trò chuyện họ tham gia.
CREATE POLICY "Enable read for users in conversation" ON public.messages FOR SELECT TO authenticated USING (
    match_id IN (
        SELECT id FROM public.matches WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
);
-- Cho phép người dùng gửi tin nhắn vào cuộc trò chuyện họ tham gia.
CREATE POLICY "Enable insert for users in conversation" ON public.messages FOR INSERT TO authenticated WITH CHECK (
    (sender_id = auth.uid()) AND
    (match_id IN (
        SELECT id FROM public.matches WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    ))
);

-- Giai đoạn 5: Bật Realtime cho bảng messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- Helper function to extract match_id from storage object path (e.g., "{match_id}/file.png")
CREATE OR REPLACE FUNCTION get_match_id_from_path(path_name text)
RETURNS uuid AS $$
DECLARE
  match_id_text text;
BEGIN
  match_id_text := split_part(path_name, '/', 1);
  RETURN match_id_text::uuid;
EXCEPTION WHEN others THEN
  -- Return a random UUID on parse error to ensure the subsequent check fails safely
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- RLS Policy: Allow users to UPLOAD to the 'message_attachments' bucket 
-- if they are a member of the match corresponding to the upload path.
CREATE POLICY "Enable insert for users in conversation"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'message_attachments' AND
    auth.uid() IN (
        SELECT user1_id FROM public.matches WHERE id = get_match_id_from_path(name)
        UNION ALL
        SELECT user2_id FROM public.matches WHERE id = get_match_id_from_path(name)
    )
);

-- RLS Policy: Allow users to SELECT from the 'message_attachments' bucket 
-- if they are a member of the match corresponding to the file path.
CREATE POLICY "Enable read for users in conversation"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'message_attachments' AND
    auth.uid() IN (
        SELECT user1_id FROM public.matches WHERE id = get_match_id_from_path(name)
        UNION ALL
        SELECT user2_id FROM public.matches WHERE id = get_match_id_from_path(name)
    )
);
-- Giai đoạn 1: Tạo hàm SECURITY DEFINER để kiểm tra tư cách thành viên một cách an toàn.
-- Hàm này bỏ qua RLS trên bảng `matches` để chính sách lưu trữ có thể xác định xem người dùng có phải là thành viên của cuộc trò chuyện hay không.
CREATE OR REPLACE FUNCTION public.is_member_of_match(match_id_to_check uuid, user_id_to_check uuid)
RETURNS boolean AS $$
BEGIN
  -- Bỏ qua RLS một cách an toàn vì hàm này là SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1
    FROM public.matches
    WHERE id = match_id_to_check
      AND (user1_id = user_id_to_check OR user2_id = user_id_to_check)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Giai đoạn 2: Xóa các chính sách lưu trữ cũ.
-- Chúng ta cần xóa chúng trước khi tạo các chính sách mới.
DROP POLICY IF EXISTS "Enable insert for users in conversation" ON storage.objects;
DROP POLICY IF EXISTS "Enable read for users in conversation" ON storage.objects;


-- Giai đoạn 3: Tạo lại các chính sách lưu trữ bằng cách sử dụng hàm trợ giúp mới.

-- Cho phép người dùng TẢI LÊN vào bucket 'message_attachments' nếu họ là thành viên của cuộc trò chuyện.
CREATE POLICY "Enable insert for users in conversation"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'message_attachments' AND
    public.is_member_of_match(get_match_id_from_path(name), auth.uid())
);

-- Cho phép người dùng XEM các đối tượng trong bucket 'message_attachments' nếu họ là thành viên của cuộc trò chuyện.
CREATE POLICY "Enable read for users in conversation"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'message_attachments' AND
    public.is_member_of_match(get_match_id_from_path(name), auth.uid())
);
-- Thêm cột role và status vào bảng profiles
-- 'role' có thể là 'user' hoặc 'admin'
-- 'status' có thể là 'active' hoặc 'locked'
ALTER TABLE public.profiles
ADD COLUMN role TEXT NOT NULL DEFAULT 'user',
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Thêm các ràng buộc kiểm tra cho các cột mới để đảm bảo tính toàn vẹn của dữ liệu
ALTER TABLE public.profiles
ADD CONSTRAINT check_role CHECK (role IN ('user', 'admin')),
ADD CONSTRAINT check_status CHECK (status IN ('active', 'locked'));

-- Tạo bảng cho các thông báo hệ thống do quản trị viên gửi
CREATE TABLE public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    content TEXT NOT NULL,
    -- Nếu target_user_id là NULL, đó là một thông báo quảng bá cho tất cả người dùng
    target_user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    -- Quản trị viên đã tạo thông báo
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    -- Loại thông báo
    notification_type TEXT NOT NULL DEFAULT 'info' -- ví dụ: 'info', 'warning'
);

-- Bật RLS cho bảng mới
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- Chính sách RLS cho system_notifications:
-- 1. Quản trị viên có toàn quyền truy cập.
CREATE POLICY "Allow admins full access"
ON public.system_notifications
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- 2. Người dùng có thể đọc các thông báo của riêng họ và các thông báo quảng bá.
CREATE POLICY "Allow users to read their notifications"
ON public.system_notifications
FOR SELECT
TO authenticated
USING (
  target_user_id = auth.uid() OR target_user_id IS NULL
);
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  interests TEXT[],
  looking_for TEXT CHECK (looking_for IN ('friendship', 'dating', 'serious_relationship', 'networking')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create matches table for user connections
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'matched', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create messages table for chat functionality
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create photos table for user photos
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for matches
CREATE POLICY "Users can view their own matches" 
ON public.matches 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create matches" 
ON public.matches 
FOR INSERT 
WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update their own matches" 
ON public.matches 
FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their matches" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.matches 
    WHERE matches.id = messages.match_id 
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their matches" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.matches 
    WHERE matches.id = messages.match_id 
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    AND matches.status = 'matched'
  )
);

-- Create RLS policies for photos
CREATE POLICY "Users can view all photos" 
ON public.photos 
FOR SELECT 
USING (true);

CREATE POLICY "Users can upload their own photos" 
ON public.photos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" 
ON public.photos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" 
ON public.photos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  interests TEXT[],
  looking_for TEXT CHECK (looking_for IN ('friendship', 'dating', 'serious_relationship', 'networking')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create matches table for user connections
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'matched', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create messages table for chat functionality
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create photos table for user photos
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for matches
CREATE POLICY "Users can view their own matches" 
ON public.matches 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create matches" 
ON public.matches 
FOR INSERT 
WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update their own matches" 
ON public.matches 
FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their matches" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.matches 
    WHERE matches.id = messages.match_id 
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their matches" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.matches 
    WHERE matches.id = messages.match_id 
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    AND matches.status = 'matched'
  )
);

-- Create RLS policies for photos
CREATE POLICY "Users can view all photos" 
ON public.photos 
FOR SELECT 
USING (true);

CREATE POLICY "Users can upload their own photos" 
ON public.photos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" 
ON public.photos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" 
ON public.photos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();-- Fix critical security issue: restrict profile visibility for dating app
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
USING (auth.uid() = user_id);-- Fix critical security issue: restrict photo visibility for dating app
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
);-- Create storage bucket for user photos
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
USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Người dùng mới'));
  RETURN NEW;
END;
$$;

-- Create trigger to fire when new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();-- Fix function search path mutable issue by explicitly setting search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Người dùng mới'));
  RETURN NEW;
END;
$$;-- Create security definer functions to avoid RLS recursion
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
);-- Fix search_path for security definer functions
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
$$;-- Add new fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('nam', 'nữ')),
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS looking_for_gender text CHECK (looking_for_gender IN ('nam', 'nữ', 'cả hai'));

-- Update looking_for column to be more specific about connection type
COMMENT ON COLUMN public.profiles.looking_for IS 'What type of connection the user is looking for';
COMMENT ON COLUMN public.profiles.looking_for_gender IS 'Gender preference for connections';-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add messages table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;-- Create blocked_users table for blocking functionality
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
);-- Reset database by deleting all data from all tables
-- Delete in order to respect foreign key constraints

-- Delete messages first (references matches)
DELETE FROM public.messages;

-- Delete photos (no foreign key dependencies)
DELETE FROM public.photos;

-- Delete matches
DELETE FROM public.matches;

-- Delete blocked_users
DELETE FROM public.blocked_users;

-- Delete reports
DELETE FROM public.reports;

-- Delete user_preferences
DELETE FROM public.user_preferences;

-- Delete profiles last (might be referenced by other tables)
DELETE FROM public.profiles;-- Update RLS policy for profiles to only require full_name for searching
DROP POLICY IF EXISTS "Users can view potential matches only" ON public.profiles;

CREATE POLICY "Users can view potential matches only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() <> user_id AND 
  full_name IS NOT NULL AND 
  NOT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = auth.uid() AND blocked_id = profiles.user_id
  ) AND 
  NOT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = profiles.user_id AND blocked_id = auth.uid()
  )
);-- Update RLS policy to require gender, age, and looking_for
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
);-- Temporarily relax RLS policy for easier testing
DROP POLICY IF EXISTS "Users can view potential matches only" ON public.profiles;

CREATE POLICY "Users can view potential matches only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() <> user_id AND 
  full_name IS NOT NULL AND
  NOT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = auth.uid() AND blocked_id = profiles.user_id
  ) AND 
  NOT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = profiles.user_id AND blocked_id = auth.uid()
  )
);-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  age INTEGER,
  gender TEXT,
  bio TEXT,
  location TEXT,
  interests TEXT[],
  looking_for TEXT,
  looking_for_gender TEXT,
  birth_date DATE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create photos table
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (public read, own write)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for photos
CREATE POLICY "Photos are viewable by everyone"
  ON public.photos FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own photos"
  ON public.photos FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for matches
CREATE POLICY "Users can view own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own matches"
  ON public.matches FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their matches"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_id 
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their matches"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_id 
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- RLS Policies for blocked_users
CREATE POLICY "Users can view own blocks"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can manage own blocks"
  ON public.blocked_users FOR ALL
  USING (auth.uid() = blocker_id);

-- RLS Policies for reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name)
  VALUES (new.id, new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();-- Add reason column to blocked_users table
ALTER TABLE public.blocked_users 
ADD COLUMN reason text;

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_age boolean DEFAULT true,
  show_distance boolean DEFAULT true,
  show_last_active boolean DEFAULT false,
  only_show_verified boolean DEFAULT false,
  hide_profile_from_feed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();-- Create storage bucket for user photos
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
  );ALTER TABLE public.profiles ADD COLUMN last_active timestamptz NULL;-- 1. Create Storage Bucket
-- Creates a new, non-public bucket for storing images sent in messages.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('message_attachments', 'message_attachments', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Drop Existing Policies (for idempotency)
-- Ensures that the script can be re-run without errors by removing old policies first.
DROP POLICY IF EXISTS "Allow read access to conversation members" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert access to conversation members" ON storage.objects;

-- 3. Create SELECT Policy
-- Allows users to view images if they are a member of the conversation (match).
CREATE POLICY "Allow read access to conversation members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message_attachments' AND
  EXISTS (
    SELECT 1
    FROM public.matches
    WHERE public.matches.id = (string_to_array(storage.objects.name, '/'))[1]::uuid
      AND (public.matches.user1_id = auth.uid() OR public.matches.user2_id = auth.uid())
  )
);

-- 4. Create INSERT Policy
-- Allows users to upload images if they are a member of the conversation (match).
CREATE POLICY "Allow insert access to conversation members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message_attachments' AND
  EXISTS (
    SELECT 1
    FROM public.matches
    WHERE public.matches.id = (string_to_array(storage.objects.name, '/'))[1]::uuid
      AND (public.matches.user1_id = auth.uid() OR public.matches.user2_id = auth.uid())
  )
);

-- Drop the function if it already exists to ensure a clean setup
DROP FUNCTION IF EXISTS get_random_profiles_with_photos(uuid, text, integer, integer, integer, uuid[]);

-- Create the function that fetches random profiles with their photos
CREATE OR REPLACE FUNCTION get_random_profiles_with_photos(
    current_user_id uuid,
    gender_filter text,
    min_age integer,
    max_age integer,
    count_limit integer,
    excluded_ids uuid[]
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    full_name text,
    age integer,
    bio text,
    location text,
    interests text[],
    avatar_url text,
    gender text,
    photos json
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH profiles_with_photos AS (
      SELECT
          p.id,
          p.user_id,
          p.full_name,
          p.age,
          p.bio,
          p.location,
          p.interests,
          p.avatar_url,
          p.gender,
          -- Aggregate photos into a JSON array, ensuring order
          json_agg(
              json_build_object(
                  'id', ph.id,
                  'url', ph.url,
                  'is_primary', ph.is_primary
              ) ORDER BY ph.is_primary DESC, ph.created_at ASC
          ) FILTER (WHERE ph.id IS NOT NULL) AS photos
      FROM
          profiles AS p
      -- Join photos table
      LEFT JOIN
          photos AS ph ON p.user_id = ph.user_id
      WHERE
          -- Exclude the current user from the pool
          p.user_id != current_user_id
          
          -- Exclude profiles already seen by the user in the current swiping session
          AND NOT (p.user_id = ANY(excluded_ids))
          
          -- Exclude profiles the user has already matched with, liked, or been passed by
          AND NOT EXISTS (
              SELECT 1
              FROM matches m
              WHERE 
                (m.user1_id = current_user_id AND m.user2_id = p.user_id) OR
                (m.user2_id = current_user_id AND m.user1_id = p.user_id)
          )
          
          -- Apply dynamic filters if they are provided
          AND (gender_filter IS NULL OR p.gender = gender_filter)
          AND p.age >= min_age
          AND p.age <= max_age
          
          -- Ensure profile has a name and age to be minimally viable
          AND p.age IS NOT NULL
          AND p.full_name IS NOT NULL
      
      GROUP BY
          p.id, p.user_id
    )
    -- Final selection from the aggregated data
    SELECT
        *
    FROM
        profiles_with_photos
    -- Ensure we only return profiles that actually have photos
    WHERE
        json_array_length(COALESCE(photos, '[]'::json)) > 0
    -- Randomize the order of the returned profiles
    ORDER BY
        random()
    -- Limit the number of profiles returned
    LIMIT
        count_limit;
END;
$$;
