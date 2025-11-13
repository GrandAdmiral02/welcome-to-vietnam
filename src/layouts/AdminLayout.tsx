import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

const AdminLayout = () => {
  const { user, loading, profile } = useAuth();

  // Đang trong quá trình tải thông tin người dùng và hồ sơ
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Người dùng chưa đăng nhập hoặc không phải là quản trị viên
  if (!user || profile?.role !== 'admin') {
    // Chuyển hướng họ đến trang chính hoặc trang đăng nhập
    return <Navigate to="/" replace />;
  }

  // Nếu người dùng là quản trị viên, hiển thị nội dung được yêu cầu (ví dụ: trang quản trị)
  return <Outlet />;
};

export default AdminLayout;
