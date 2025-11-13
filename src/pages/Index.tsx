import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, Sparkles, Search, UserCircle, Compass, ArrowRight } from 'lucide-react';
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
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-background via-background to-muted/20">
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* New Enhanced Hero Section - Corrected */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:p-12 mb-16 border border-primary/20">
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
            <div className="relative z-10 text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-4">
                    Chào mừng đến với Hippo Lovely
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto md:mx-0 mb-8">
                    Không chỉ là hẹn hò. Đây là nơi để xây dựng những mối quan hệ chân thành và tìm thấy những tâm hồn đồng điệu.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                    <Button size="lg" onClick={() => navigate('/discover')} className="shadow-lg hover:shadow-primary/40 transition-shadow">
                        Khám phá ngay <Compass className="w-5 h-5 ml-2" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate('/random-match')}>
                        Bắt đầu ghép đôi <Sparkles className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <QuickActionCard
            icon={Compass}
            title="Khám phá"
            description="Duyệt qua danh sách người dùng và tìm kiếm kết nối mới"
            onClick={() => navigate('/discover')}
          />
          <QuickActionCard
            icon={Search}
            title="Tìm kiếm"
            description="Tìm người dùng theo tên hoặc ID để kết nối"
            onClick={() => navigate('/browse')}
          />
           <QuickActionCard
            icon={Sparkles}
            title="Ghép đôi ngẫu nhiên"
            description="Gặp gỡ người mới một cách bất ngờ và thú vị"
            onClick={() => navigate('/random-match')}
            gradient={true}
          />
          <QuickActionCard
            icon={MessageCircle}
            title="Tin nhắn"
            description="Trò chuyện với các kết nối và bạn bè của bạn"
            onClick={() => navigate('/messages')}
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
