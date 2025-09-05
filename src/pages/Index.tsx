import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, MessageCircle, Sparkles, LogOut } from 'lucide-react';

const Index = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b glass sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-primary rounded-full p-2 float">
              <Heart className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Hippo Lovely</h1>
            <Sparkles className="h-6 w-6 text-accent animate-pulse" />
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
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-5xl font-bold mb-6 gradient-text">
            Khám phá thế giới kết nối
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Tìm kiếm những mối quan hệ ý nghĩa, kết bạn và khám phá tình yêu với Hippo Lovely
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="card-hover group cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="bg-primary/10 rounded-full p-4 w-fit mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Khám phá người dùng</h3>
              <p className="text-muted-foreground">
                Tìm kiếm và kết nối với những người phù hợp với bạn
              </p>
            </CardContent>
          </Card>
          
          <Card className="card-hover group cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="bg-accent/10 rounded-full p-4 w-fit mx-auto mb-6 group-hover:bg-accent/20 transition-colors">
                <Heart className="h-12 w-12 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Kết nối ý nghĩa</h3>
              <p className="text-muted-foreground">
                Xây dựng những mối quan hệ bền vững và chân thật
              </p>
            </CardContent>
          </Card>
          
          <Card className="card-hover group cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="bg-primary/10 rounded-full p-4 w-fit mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <MessageCircle className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Trò chuyện thú vị</h3>
              <p className="text-muted-foreground">
                Chia sẻ câu chuyện và tạo dựng kỷ niệm đẹp
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-3xl mx-auto pulse-glow">
            <CardContent className="p-12">
              <h3 className="text-3xl font-bold mb-6 gradient-text">Sẵn sàng bắt đầu?</h3>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Hoàn thiện hồ sơ của bạn và bắt đầu khám phá những kết nối mới
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button size="xl" variant="hero">
                  <Users className="h-5 w-5 mr-2" />
                  Khám phá người dùng
                </Button>
                <Button size="xl" variant="premium">
                  <Heart className="h-5 w-5 mr-2" />
                  Hoàn thiện hồ sơ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
