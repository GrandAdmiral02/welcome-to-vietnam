import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Heart, MessageCircle, ArrowLeft, Users, Sparkles, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  status: string;
  profile: {
    user_id: string;
    full_name: string;
    age: number;
    bio: string;
    location: string;
    interests: string[];
    avatar_url: string;
  };
  photos: Array<{
    url: string;
    is_primary: boolean;
  }>;
}

export default function Matches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      
      // Fetch matches where current user is involved
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .eq('status', 'matched')
        .order('created_at', { ascending: false });

      if (matchesError) throw matchesError;

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        return;
      }

      // Get the other user's ID for each match
      const otherUserIds = matchesData.map(match => 
        match.user1_id === user?.id ? match.user2_id : match.user1_id
      );

      // Fetch profiles for matched users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', otherUserIds);

      if (profilesError) throw profilesError;

      // Fetch photos for matched users
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .in('user_id', otherUserIds)
        .order('is_primary', { ascending: false });

      if (photosError) throw photosError;

      // Combine the data
      const enrichedMatches = matchesData.map(match => {
        const otherUserId = match.user1_id === user?.id ? match.user2_id : match.user1_id;
        const profile = profilesData?.find(p => p.user_id === otherUserId);
        const userPhotos = photosData?.filter(p => p.user_id === otherUserId) || [];
        
        return {
          ...match,
          profile: profile || null,
          photos: userPhotos
        };
      }).filter(match => match.profile); // Only include matches with profiles

      setMatches(enrichedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách kết nối",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (matchId: string) => {
    navigate(`/messages?match_id=${matchId}`);
  };

  const getPrimaryPhoto = (photos: Array<{url: string; is_primary: boolean}>) => {
    const primary = photos.find(p => p.is_primary);
    return primary?.url || photos[0]?.url || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gradient-bg)] flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-8 w-8 text-primary animate-pulse mx-auto mb-2" />
          <p className="text-muted-foreground">Đang tải kết nối...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)]">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Kết nối của bạn</h1>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {matches.length} kết nối
          </Badge>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {matches.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="bg-muted/30 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Heart className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Chưa có kết nối nào</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Hãy bắt đầu khám phá và tìm kiếm những người phù hợp với bạn. 
              Khi có người thích bạn và bạn cũng thích họ, họ sẽ xuất hiện ở đây.
            </p>
            <Button 
              onClick={() => navigate('/discover')}
              className="bg-[var(--gradient-primary)] hover:opacity-90"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Bắt đầu khám phá
            </Button>
          </div>
        ) : (
          // Matches grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <Card 
                key={match.id} 
                className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-xl transition-all overflow-hidden group"
              >
                <div className="relative">
                  {/* Profile Image */}
                  <div className="aspect-[4/5] bg-muted relative overflow-hidden">
                    {getPrimaryPhoto(match.photos) ? (
                      <img
                        src={getPrimaryPhoto(match.photos)!}
                        alt={match.profile.full_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Avatar className="w-24 h-24">
                          <AvatarFallback className="text-2xl bg-primary/20">
                            {match.profile.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    
                    {/* Match date overlay */}
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary/90 text-primary-foreground">
                        <Heart className="h-3 w-3 mr-1" />
                        Kết nối
                      </Badge>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-bold">{match.profile.full_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {match.profile.age && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {match.profile.age} tuổi
                            </span>
                          )}
                          {match.profile.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {match.profile.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {match.profile.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {match.profile.bio}
                        </p>
                      )}

                      {match.profile.interests && match.profile.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {match.profile.interests.slice(0, 3).map((interest, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                          {match.profile.interests.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{match.profile.interests.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Kết nối từ {format(new Date(match.created_at), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  </CardContent>

                  {/* Action Button */}
                  <div className="p-4 pt-0">
                    <Button 
                      onClick={() => handleStartChat(match.id)}
                      className="w-full bg-[var(--gradient-primary)] hover:opacity-90"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Nhắn tin
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}