import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ShieldCheck, UserCircle, LogOut, Newspaper, MessagesSquare, Search, Sparkles } from 'lucide-react'; // Changed Compass to Newspaper
import { NavLink, useNavigate } from 'react-router-dom';
import { useUnreadMessages } from '@/hooks/useUnreadMessages'; // Import the new hook
import { ModeToggle } from '../mode-toggle';

const navLinks = [
  { href: '/news', label: 'Tin tức', icon: Newspaper }, // Changed from /discover and Khám phá
  { href: '/browse', label: 'Tìm kiếm', icon: Search },
  { href: '/random-match', label: 'Ghép đôi', icon: Sparkles },
  { href: '/messages', label: 'Tin nhắn', icon: MessagesSquare, id: 'messages-link' }, // Add id for targeting
];

export const Header = () => {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages(); // Use the hook
  const displayName = user?.user_metadata?.full_name || user?.email || 'Người dùng';

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Đăng xuất thất bại:', error);
      alert('Đã có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.');
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left Side: Logo and Title */}
        <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => navigate('/')}>
          <img src="/image-Photoroom.png" alt="Hippo Lovely Logo" className="h-16 w-auto" />
          <h1 className="text-xl font-bold text-foreground">Hippo Lovely</h1>
        </div>

        {/* Middle: Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              {/* Unread message badge */}
              {link.id === 'messages-link' && unreadCount > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right Side: User Actions */}
        <div className="flex items-center gap-2">
            <ModeToggle />
          {profile?.role === 'admin' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              title="Quản trị"
            >
              <ShieldCheck className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/user/${user?.id}`)}
          >
            <UserCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{displayName}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </nav>
    </header>
  );
};
