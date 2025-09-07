import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, MessageCircle, Sparkles, LogOut } from 'lucide-react';
import Head from 'next/head'; // Nếu dùng Next.js
import { vietnamProvinces } from './vietnamProvinces'; // File tỉnh/thành phố

// Component FeatureCard
const FeatureCard = ({ icon: Icon, title, description }) => (
  <Card className="card-hover group cursor-pointer">
    <CardContent className="p-8 text-center">
      <div className="bg-primary/10 rounded-full p-4 w-fit mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-12 w-12 text-primary" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

// Component ProvinceSelector
const ProvinceSelector = () => (
  <select className="mt-4 p-2 border rounded" aria-label="Chọn tỉnh/thành phố">
    <option value="">Chọn tỉnh/thành phố</option>
    {vietnamProvinces.map((province, index) => (
      <option key={index} value={province}>
        {province}
      </option>
    ))}
  </select>
);

const Index = () => {
  const { user, signOut } = useAuth();
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Đang tải...</p>
      </div>
    );
  }

  const features = [
    {
      icon: Users,
      title: 'Khám phá người dùng',
      description: 'Tìm kiếm và kết nối với những người phù hợp với bạn',
    },
    {
      icon: Heart,
      title: 'Kết nối ý nghĩa',
      description: 'Xây dựng những mối quan hệ bền vững và chân thật',
    },
    {
      icon: MessageCircle,
      title: 'Trò chuyện thú vị',
      description: 'Chia sẻ câu chuyện và tạo dựng kỷ niệm đẹp',
    },
  ];

  return (
    <div className="min-h-screen">
      <Head>
        <title>Hippo Lovely - Kết nối yêu thương</title>
        <meta name="description" content="Tìm kiếm mối quan hệ ý nghĩa và kết nối với những người phù hợp trên Hippo Lovely." />
      </Head>

      {/* Header */}
      <header className="border-b glass sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-primary rounded-full p-2 float">
              <Heart className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Hippo Lovely</h1>
            <Sparkles className="h-6 w-6 text-accent subtle-pulse" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Xin chào, {displayName}!</span>
            <Button variant="outline" size="sm" onClick={handleSignOut} aria-label="Đăng xuất">
              <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
              Đăng xuất
            </Button>
          </div>
        </nav>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16" role="region" aria-labelledby="features-heading">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
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
                <Button size="xl" variant="hero" aria-label="Khám phá người dùng">
                  <Users className="h-5 w-5 mr-2" aria-hidden="true" />
                  Khám phá người dùng
                </Button>
                <Button size="xl" variant="premium" aria-label="Hoàn thiện hồ sơ">
                  <Heart className="h-5 w-5 mr-2" aria-hidden="true" />
                  Hoàn thiện hồ sơ
                </Button>
              </div>
              <ProvinceSelector />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
