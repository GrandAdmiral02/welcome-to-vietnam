import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet, NavLink } from "react-router-dom";
import { Loader2, Newspaper, Shield } from "lucide-react"; // Changed Home, Music to Newspaper
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const AdminLayout = () => {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
      isActive && "text-primary bg-muted"
    );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <NavLink to="/admin" className="flex items-center gap-2 font-semibold">
              <Shield className="h-6 w-6 text-primary" />
              <span>Admin Panel</span>
            </NavLink>
          </div>
          <nav className="flex-1 grid items-start px-2 text-sm font-medium lg:px-4">
            {/* Changed Dashboard to Article Management */}
            <NavLink to="/admin" end className={navLinkClass}>
              <Newspaper className="h-4 w-4" />
              Quản lý Bài viết
            </NavLink>
            {/* Removed the old Music Management link */}
          </nav>
          <div className="mt-auto p-4">
             <Button size="sm" className="w-full" asChild>
                <NavLink to="/">Về trang chính</NavLink>
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
         {/* A simple header for mobile could be added here if needed */}
         <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
