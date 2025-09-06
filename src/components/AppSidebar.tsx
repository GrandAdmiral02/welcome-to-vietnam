import { Heart, MessageCircle, User, Settings, Compass, Users, LogOut, Sparkles, Grid, UserPlus } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Trang chủ", url: "/", icon: Heart },
  { title: "Khám phá", url: "/discover", icon: Compass },
  { title: "Random Match", url: "/random-match", icon: Sparkles },
  { title: "Thêm bạn", url: "/browse", icon: UserPlus },
  { title: "Kết nối", url: "/matches", icon: Users },
  { title: "Tin nhắn", url: "/messages", icon: MessageCircle },
  { title: "Hồ sơ", url: "/profile", icon: User },
  { title: "Cài đặt", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary border-r-2 border-primary" : "hover:bg-muted/50";

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Lỗi đăng xuất",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b p-4">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-full p-2">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Hippo Lovely
            </span>
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
          </div>
        ) : (
          <div className="bg-primary rounded-full p-2 mx-auto">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                      {item.url === "/messages" && !isCollapsed && (
                        <Badge className="ml-auto bg-destructive text-xs">2</Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-xs">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.user_metadata?.full_name || "Người dùng"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Avatar className="h-8 w-8 mx-auto">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-xs">
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full p-2" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}