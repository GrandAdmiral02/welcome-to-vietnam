import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, MessageCircle, Sparkles, Search, UserCircle, Newspaper, ArrowRight, Users, Bell, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

// Component SuggestedUserCard
const SuggestedUserCard = ({ profile, onClick }) => (
  <Card 
    className="group cursor-pointer border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12 border-2 border-primary/20">
          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {profile.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{profile.full_name || 'Người dùng'}</h4>
          <p className="text-sm text-muted-foreground truncate">
            {profile.age ? `${profile.age} tuổi` : ''} {profile.location ? `• ${profile.location}` : ''}
          </p>
        </div>
      </div>
      {profile.interests && profile.interests.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {profile.interests.slice(0, 3).map((interest, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {interest}
            </Badge>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// Component ActivityItem
const ActivityItem = ({ icon: Icon, title, description, time, color = 'text-primary' }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
  </div>
);

// Component ArticleCard
const ArticleCard = ({ article, onClick }) => (
  <Card 
    className="group cursor-pointer border transition-all duration-300 hover:shadow-md overflow-hidden"
    onClick={onClick}
  >
    {article.image_url && (
      <div className="aspect-video overflow-hidden">
        <img 
          src={article.image_url} 
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
    )}
    <CardContent className="p-4">
      <h4 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
        {article.title}
      </h4>
      <p className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: vi })}
      </p>
    </CardContent>
  </Card>
);

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHomeData();
    }
  }, [user]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      // Fetch suggested users (random profiles)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, age, location, interests')
        .neq('user_id', user.id)
        .not('full_name', 'is', null)
        .limit(6);
      
      setSuggestedUsers(profiles || []);

      // Fetch recent activity (messages, matches, follows)
      const activities = [];
      
      // Recent matches
      const { data: matches } = await supabase
        .from('matches')
        .select('id, created_at, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (matches) {
        for (const match of matches) {
          const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', otherUserId)
            .maybeSingle();
          
          activities.push({
            type: 'match',
            icon: Heart,
            title: 'Ghép đôi mới',
            description: `Bạn đã ghép đôi với ${profile?.full_name || 'người dùng'}`,
            time: formatDistanceToNow(new Date(match.created_at), { addSuffix: true, locale: vi }),
            color: 'text-pink-500'
          });
        }
      }

      // Recent unread messages count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (unreadCount && unreadCount > 0) {
        activities.unshift({
          type: 'message',
          icon: MessageCircle,
          title: 'Tin nhắn chưa đọc',
          description: `Bạn có ${unreadCount} tin nhắn chưa đọc`,
          time: 'Mới',
          color: 'text-blue-500'
        });
      }

      // Recent followers
      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2);

      if (followers) {
        for (const follow of followers) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', follow.follower_id)
            .maybeSingle();
          
          activities.push({
            type: 'follow',
            icon: Users,
            title: 'Người theo dõi mới',
            description: `${profile?.full_name || 'Người dùng'} đã theo dõi bạn`,
            time: formatDistanceToNow(new Date(follow.created_at), { addSuffix: true, locale: vi }),
            color: 'text-green-500'
          });
        }
      }

      setRecentActivity(activities.slice(0, 5));

      // Fetch featured articles
      const { data: articles } = await supabase
        .from('articles')
        .select('id, title, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(4);
      
      setFeaturedArticles(articles || []);

    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
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
    <div className="bg-gradient-to-br from-background via-background to-muted/20">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:p-10 mb-10 border border-primary/20">
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-3">
              Chào mừng trở lại!
            </h1>
            <p className="text-muted-foreground max-w-xl mb-6">
              Khám phá những kết nối mới và theo dõi hoạt động của bạn.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/random-match')} className="shadow-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Ghép đôi ngẫu nhiên
              </Button>
              <Button variant="outline" onClick={() => navigate('/browse')}>
                <Search className="w-4 h-4 mr-2" />
                Tìm kiếm
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <QuickActionCard
            icon={Newspaper}
            title="Tin tức"
            description="Cập nhật mới nhất"
            onClick={() => navigate('/news')}
          />
          <QuickActionCard
            icon={Search}
            title="Tìm kiếm"
            description="Tìm người dùng"
            onClick={() => navigate('/browse')}
          />
          <QuickActionCard
            icon={Sparkles}
            title="Ghép đôi"
            description="Gặp gỡ ngẫu nhiên"
            onClick={() => navigate('/random-match')}
            gradient={true}
          />
          <QuickActionCard
            icon={MessageCircle}
            title="Tin nhắn"
            description="Trò chuyện"
            onClick={() => navigate('/messages')}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Suggested Users */}
          <div className="lg:col-span-2 space-y-6">
            {/* Suggested Users */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Người dùng đề xuất
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/browse')}>
                  Xem tất cả <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-lg" />
                    ))}
                  </div>
                ) : suggestedUsers.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {suggestedUsers.map((profile) => (
                      <SuggestedUserCard
                        key={profile.user_id}
                        profile={profile}
                        onClick={() => navigate(`/user/${profile.user_id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Không có người dùng đề xuất
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Featured Articles */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-primary" />
                  Tin tức nổi bật
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/news')}>
                  Xem tất cả <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-40 rounded-lg" />
                    ))}
                  </div>
                ) : featuredArticles.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {featuredArticles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onClick={() => navigate(`/news/${article.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Chưa có tin tức nào
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Activity & Profile CTA */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Hoạt động gần đây
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-1">
                    {recentActivity.map((activity, idx) => (
                      <ActivityItem
                        key={idx}
                        icon={activity.icon}
                        title={activity.title}
                        description={activity.description}
                        time={activity.time}
                        color={activity.color}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">
                    Chưa có hoạt động nào
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Profile CTA */}
            <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Hoàn thiện hồ sơ
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Cập nhật thông tin để tăng cơ hội kết nối
                </p>
                <Button 
                  className="w-full"
                  onClick={() => navigate('/profile')}
                >
                  <UserCircle className="w-4 h-4 mr-2" />
                  Chỉnh sửa hồ sơ
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
