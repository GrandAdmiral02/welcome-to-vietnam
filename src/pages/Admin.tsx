import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from "@/components/admin/UserManagement";
import SystemNotifications from "@/components/admin/SystemNotifications";
import ArticleManagement from "@/components/admin/ArticleManagement"; // Import the new component
import { ShieldCheck } from "lucide-react";

const AdminPage = () => {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Trang Quản trị</h1>
      </div>
      <Tabs defaultValue="user-management">
        {/* Updated to have 3 columns */}
        <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
          <TabsTrigger value="user-management">Quản lý Người dùng</TabsTrigger>
          <TabsTrigger value="article-management">Quản lý Bài viết</TabsTrigger> {/* Add new tab trigger */}
          <TabsTrigger value="system-notifications">Thông báo Hệ thống</TabsTrigger>
        </TabsList>
        <TabsContent value="user-management">
          <UserManagement />
        </TabsContent>
        {/* Add new tab content */}
        <TabsContent value="article-management">
          <ArticleManagement />
        </TabsContent>
        <TabsContent value="system-notifications">
          <SystemNotifications />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
