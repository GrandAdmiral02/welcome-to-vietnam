import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Heart, MessageCircle, User, Settings, LogOut, Sparkles, Camera, Star, TrendingUp, Users, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [stats, setStats] = useState({
    totalMatches: 0,
    newMessages: 0,
    profileViews: 0
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (data) {
        setProfile(data);
        calculateProfileCompletion(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch matches count
      const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .eq('status', 'matched');

      // Fetch new messages count (simplified - in real app would check read status)
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', user?.id);

      setStats({
        totalMatches: matchesCount || 0,
        newMessages: messagesCount || 0,
        profileViews: Math.floor(Math.random() * 50) + 10 // Mock data
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const calculateProfileCompletion = (profileData: any) => {
    const fields = ['full_name', 'age', 'bio', 'location', 'gender', 'looking_for'];
    const completedFields = fields.filter(field => profileData[field]);
    const completion = Math.round((completedFields.length / fields.length) * 100);
    setProfileCompletion(completion);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-bg)]">
        <div className="text-center">
          <Heart className="h-8 w-8 text-primary animate-pulse mx-auto mb-2" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
    <div className="min-h-screen bg-[var(--gradient-bg)]">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[var(--gradient-primary)] rounded-full p-2">
              <Heart className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-[var(--gradient-primary)] bg-clip-text text-transparent">
              Hippo Lovely
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              className="relative"
              onClick={() => navigate('/matches')}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Kết nối
              {stats.newMessages > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs bg-destructive">
                  {stats.newMessages}
                </Badge>
              )}
            </Button>
            <Avatar className="ring-2 ring-primary/20">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10">
                {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-[var(--gradient-primary)] bg-clip-text text-transparent">
            Chào mừng, {user.user_metadata?.full_name || 'bạn'}! 
            <Sparkles className="inline h-6 w-6 ml-2 text-primary animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-lg">
            Khám phá những kết nối mới và tìm thấy người đặc biệt của bạn
          </p>
        </div>

        {/* Profile Completion Banner */}
        {profileCompletion < 100 && (
          <Card className="mb-8 bg-[var(--gradient-primary)] text-primary-foreground border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Hoàn thiện hồ sơ của bạn</h3>
                  <p className="opacity-90">Hồ sơ hoàn chỉnh giúp bạn tìm được nhiều kết nối hơn</p>
                </div>
                <Camera className="h-8 w-8 opacity-80" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tiến độ hoàn thành</span>
                  <span>{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="bg-primary-foreground/20" />
              </div>
              <Button 
                variant="secondary" 
                className="mt-4"
                onClick={() => navigate('/profile')}
              >
                Hoàn thiện ngay
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary">{stats.totalMatches}</div>
              <p className="text-sm text-muted-foreground">Kết nối thành công</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <MessageCircle className="h-8 w-8 text-accent" />
              </div>
              <div className="text-2xl font-bold text-accent">{stats.newMessages}</div>
              <p className="text-sm text-muted-foreground">Tin nhắn mới</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-500">{stats.profileViews}</div>
              <p className="text-sm text-muted-foreground">Lượt xem hồ sơ</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-xl hover:scale-105 transition-all cursor-pointer group">
            <CardHeader className="text-center">
              <div className="bg-primary/10 rounded-full p-4 w-fit mx-auto mb-2 group-hover:bg-primary/20 transition-colors">
                <Heart className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-xl">Khám phá</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Tìm kiếm những người phù hợp với bạn
              </p>
              <Button className="w-full bg-[var(--gradient-primary)] hover:opacity-90">
                Bắt đầu khám phá
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-xl hover:scale-105 transition-all cursor-pointer group">
            <CardHeader className="text-center">
              <div className="bg-accent/10 rounded-full p-4 w-fit mx-auto mb-2 group-hover:bg-accent/20 transition-colors">
                <Users className="h-12 w-12 text-accent" />
              </div>
              <CardTitle className="text-xl">Kết nối</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Xem những người đã kết nối với bạn
              </p>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => navigate('/matches')}
              >
                Xem kết nối
                {stats.newMessages > 0 && (
                  <Badge className="ml-2 bg-destructive">
                    {stats.newMessages}
                  </Badge>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-xl hover:scale-105 transition-all cursor-pointer group">
            <CardHeader className="text-center">
              <div className="bg-muted/50 rounded-full p-4 w-fit mx-auto mb-2 group-hover:bg-muted/70 transition-colors">
                <User className="h-12 w-12 text-foreground" />
              </div>
              <CardTitle className="text-xl">Hồ sơ</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Cập nhật thông tin cá nhân của bạn
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/profile')}
              >
                Chỉnh sửa hồ sơ
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Tips */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Heart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Chào mừng đến với Hippo Lovely!</p>
                      <p className="text-sm text-muted-foreground">
                        Hãy hoàn thiện hồ sơ để bắt đầu kết nối
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Mới</Badge>
                </div>
                
                {stats.totalMatches > 0 && (
                  <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-accent/20 rounded-full p-2">
                        <Users className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">Bạn có {stats.totalMatches} kết nối mới!</p>
                        <p className="text-sm text-muted-foreground">
                          Hãy bắt đầu trò chuyện ngay
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-accent">Mới</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Gợi ý cho bạn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Camera className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-primary">Thêm ảnh đại diện</p>
                      <p className="text-sm text-muted-foreground">
                        Hồ sơ có ảnh nhận được nhiều lượt thích hơn 3 lần
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 text-accent mt-0.5" />
                    <div>
                      <p className="font-medium text-accent">Viết giới thiệu hấp dẫn</p>
                      <p className="text-sm text-muted-foreground">
                        Chia sẻ sở thích và những điều bạn yêu thích
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-emerald-600">Hoạt động thường xuyên</p>
                      <p className="text-sm text-muted-foreground">
                        Đăng nhập hàng ngày để không bỏ lỡ cơ hội kết nối
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;