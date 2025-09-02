import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, X, ArrowLeft, MapPin, Calendar, Sparkles, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  age: number;
  bio: string;
  location: string;
  interests: string[];
  avatar_url: string;
  photos: Array<{
    id: string;
    url: string;
    is_primary: boolean;
  }>;
}

const Discover = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles with photos
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          age,
          bio,
          location,
          interests,
          avatar_url
        `)
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách hồ sơ",
          variant: "destructive",
        });
        return;
      }

      // Fetch photos for each profile
      const profilesWithPhotos = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: photos } = await supabase
            .from('photos')
            .select('id, url, is_primary')
            .eq('user_id', profile.user_id)
            .order('is_primary', { ascending: false });

          return {
            ...profile,
            photos: photos || []
          };
        })
      );

      setProfiles(profilesWithPhotos.filter(p => p.photos.length > 0));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tải dữ liệu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'like' | 'pass') => {
    if (currentIndex >= profiles.length) return;
    
    const targetProfile = profiles[currentIndex];
    setActionLoading(true);

    try {
      if (action === 'like') {
        // Create a match request
        const { error } = await supabase
          .from('matches')
          .insert({
            user1_id: user?.id,
            user2_id: targetProfile.user_id,
            status: 'pending'
          });

        if (error) {
          console.error('Error creating match:', error);
          toast({
            title: "Lỗi",
            description: "Không thể gửi lượt thích",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Đã thích!",
          description: `Bạn đã thích ${targetProfile.full_name}`,
        });
      }

      // Move to next profile
      setCurrentIndex(prev => prev + 1);
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Không còn hồ sơ nào!</h2>
            <p className="text-muted-foreground">
              Bạn đã xem hết tất cả hồ sơ trong khu vực. Hãy quay lại sau để khám phá thêm!
            </p>
          </div>
          <Button onClick={() => navigate('/')} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Khám phá
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentIndex + 1} / {profiles.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        <Card className="overflow-hidden shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
          {/* Photo */}
          <div className="relative aspect-[3/4] overflow-hidden">
            {currentProfile.photos[0] ? (
              <img
                src={currentProfile.photos[0].url}
                alt={currentProfile.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Camera className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Photo count indicator */}
            {currentProfile.photos.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                {currentProfile.photos.length} ảnh
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Basic info overlay */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-2xl font-bold mb-1">
                {currentProfile.full_name}, {currentProfile.age}
              </h2>
              {currentProfile.location && (
                <div className="flex items-center gap-1 text-white/90">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{currentProfile.location}</span>
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            {/* Bio */}
            {currentProfile.bio && (
              <div>
                <h3 className="font-semibold mb-2">Giới thiệu</h3>
                <p className="text-muted-foreground">{currentProfile.bio}</p>
              </div>
            )}

            {/* Interests */}
            {currentProfile.interests && currentProfile.interests.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Sở thích</h3>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.map((interest, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6 mt-6">
          <Button
            size="lg"
            variant="outline"
            className="w-16 h-16 rounded-full border-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
            onClick={() => handleAction('pass')}
            disabled={actionLoading}
          >
            <X className="w-6 h-6" />
          </Button>
          
          <Button
            size="lg"
            className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 border-0 shadow-lg"
            onClick={() => handleAction('like')}
            disabled={actionLoading}
          >
            <Heart className="w-6 h-6" />
          </Button>
        </div>

        <div className="text-center mt-4 text-sm text-muted-foreground">
          Vuốt hoặc bấm để tiếp tục
        </div>
      </div>
    </div>
  );
};

export default Discover;