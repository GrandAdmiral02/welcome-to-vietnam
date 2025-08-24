import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Heart, Users, MessageCircle, Sparkles, LogOut } from 'lucide-react';

const Index = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Hippo Lovely</h1>
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Xin chào, {user?.user_metadata?.full_name || user?.email}!
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Khám phá thế giới kết nối
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tìm kiếm những mối quan hệ ý nghĩa, kết bạn và khám phá tình yêu với Hippo Lovely
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 text-center border">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Khám phá người dùng</h3>
            <p className="text-muted-foreground">
              Tìm kiếm và kết nối với những người phù hợp với bạn
            </p>
          </div>
          
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 text-center border">
            <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Kết nối ý nghĩa</h3>
            <p className="text-muted-foreground">
              Xây dựng những mối quan hệ bền vững và chân thật
            </p>
          </div>
          
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 text-center border">
            <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Trò chuyện thú vị</h3>
            <p className="text-muted-foreground">
              Chia sẻ câu chuyện và tạo dựng kỷ niệm đẹp
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-8 border max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Sẵn sàng bắt đầu?</h3>
            <p className="text-muted-foreground mb-6">
              Hoàn thiện hồ sơ của bạn và bắt đầu khám phá những kết nối mới
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80">
                <Users className="h-5 w-5 mr-2" />
                Khám phá người dùng
              </Button>
              <Button size="lg" variant="outline">
                <Heart className="h-5 w-5 mr-2" />
                Hoàn thiện hồ sơ
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
