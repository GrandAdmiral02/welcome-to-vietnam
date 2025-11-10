import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, MessageCircle, Sparkles, LogOut, Search, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Component QuickActionCard
const QuickActionCard = ({ icon: Icon, title, description, onClick, gradient = false }) => (
  <Card 
    className="group cursor-pointer border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    onClick={onClick}
  >
    <CardContent className="p-6">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
          gradient 
            ? 'bg-gradient-to-br from-primary to-primary/60 group-hover:shadow-lg' 
            : 'bg-primary/10 group-hover:bg-primary/20'
        }`}>
          <Icon className={`w-6 h-6 ${gradient ? 'text-primary-foreground' : 'text-primary'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email || 'Người dùng';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Đăng xuất thất bại:', error);
      alert('Đã có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-primary/60 rounded-xl p-2.5">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Hippo Lovely</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/profile')}
              className="hidden sm:flex"
            >
              <UserCircle className="h-4 w-4 mr-2" />
              {displayName}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Khám phá kết nối mới
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tìm kiếm những mối quan hệ ý nghĩa và xây dựng kết nối thú vị
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <QuickActionCard
            icon={Sparkles}
            title="Random Match"
            description="Khám phá người dùng ngẫu nhiên theo bộ lọc giới tính và độ tuổi"
            onClick={() => navigate('/random-match')}
            gradient={true}
          />
          
          <QuickActionCard
            icon={Search}
            title="Tìm kiếm"
            description="Tìm người dùng theo tên hoặc ID để kết nối"
            onClick={() => navigate('/browse')}
          />
          
          <QuickActionCard
            icon={MessageCircle}
            title="Tin nhắn"
            description="Trò chuyện với các kết nối và bạn bè của bạn"
            onClick={() => navigate('/messages')}
          />
          
          <QuickActionCard
            icon={Users}
            title="Khám phá"
            description="Duyệt qua danh sách người dùng và tìm kiếm kết nối mới"
            onClick={() => navigate('/discover')}
          />
        </div>

        {/* Profile CTA */}
        <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Hoàn thiện hồ sơ
              </h3>
              <p className="text-muted-foreground">
                Cập nhật thông tin cá nhân để tăng cơ hội kết nối
              </p>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                onClick={() => navigate('/profile')}
              >
                <UserCircle className="w-5 h-5 mr-2" />
                Chỉnh sửa hồ sơ
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
