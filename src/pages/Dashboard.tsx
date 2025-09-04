import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Heart, Sparkles, Camera, Star, TrendingUp, Users, Calendar, ArrowRight, Zap, Target } from 'lucide-react';
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
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="text-center space-y-4 animate-fade-in">
        <h1 className="text-4xl font-bold gradient-text">
          Chào mừng, {user.user_metadata?.full_name || 'bạn'}! 
          <Sparkles className="inline h-6 w-6 ml-2 text-accent animate-pulse" />
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Khám phá những kết nối mới và tìm thấy người đặc biệt của bạn
        </p>
      </div>

      {/* Profile Completion Banner */}
      {profileCompletion < 100 && (
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Hoàn thiện hồ sơ của bạn</h3>
                <p className="opacity-90">Hồ sơ hoàn chỉnh giúp bạn tìm được nhiều kết nối hơn</p>
              </div>
              <Camera className="h-8 w-8 opacity-80" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Tiến độ hoàn thành</span>
                <span>{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="bg-primary-foreground/20" />
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => navigate('/profile')}
              >
                Hoàn thiện ngay
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kết nối</p>
                <p className="text-2xl font-bold text-primary">{stats.totalMatches}</p>
              </div>
              <div className="bg-primary/10 rounded-full p-3">
                <Heart className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tin nhắn mới</p>
                <p className="text-2xl font-bold text-accent">{stats.newMessages}</p>
              </div>
              <div className="bg-accent/10 rounded-full p-3">
                <Users className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lượt xem</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.profileViews}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-full p-3">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Tips & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Gợi ý cho bạn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
              <Camera className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Thêm ảnh đại diện</p>
                <p className="text-sm text-muted-foreground">Tăng cơ hội được notice</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
              <Star className="h-5 w-5 text-accent" />
              <div>
                <p className="font-medium">Viết bio hấp dẫn</p>
                <p className="text-sm text-muted-foreground">Chia sẻ sở thích của bạn</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Hoạt động thường xuyên</p>
                <p className="text-sm text-muted-foreground">Đăng nhập hàng ngày</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="bg-primary/10 rounded-full p-2">
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Chào mừng đến với Hippo Lovely!</p>
                <p className="text-sm text-muted-foreground">Hãy hoàn thiện hồ sơ để bắt đầu</p>
              </div>
              <Badge variant="secondary">Mới</Badge>
            </div>
            
            {stats.totalMatches > 0 && (
              <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
                <div className="bg-accent/20 rounded-full p-2">
                  <Users className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Bạn có {stats.totalMatches} kết nối mới!</p>
                  <p className="text-sm text-muted-foreground">Bắt đầu trò chuyện ngay</p>
                </div>
                <Badge className="bg-accent">Mới</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;