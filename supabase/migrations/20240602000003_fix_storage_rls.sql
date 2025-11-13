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
