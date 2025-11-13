
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
