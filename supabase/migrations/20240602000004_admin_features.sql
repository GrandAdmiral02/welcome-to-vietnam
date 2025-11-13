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
