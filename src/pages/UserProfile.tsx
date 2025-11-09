import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Heart, 
  MessageCircle, 
  Camera,
  UserPlus,
  MoreVertical,
  Flag,
  UserX,
  Cake,
  Info
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ReportDialog } from '@/components/ReportDialog';
import { BlockDialog } from '@/components/BlockDialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  age: number;
  birth_date: string;
  gender: string;
  bio: string;
  location: string;
  interests: string[];
  looking_for: string;
  avatar_url: string;
  created_at: string;
}

interface Photo {
  id: string;
  url: string;
  is_primary: boolean;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMatch, setIsMatch] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      if (!isOwnProfile) {
        checkMatchStatus();
      }
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin người dùng",
          variant: "destructive",
        });
        return;
      }

      setProfile(profileData);

      // Fetch photos
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });

      if (photosError) {
        console.error('Error fetching photos:', photosError);
      } else {
        setPhotos(photosData || []);
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkMatchStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user?.id})`)
        .eq('status', 'matched')
        .single();

      if (!error && data) {
        setIsMatch(true);
      }
    } catch (error) {
      console.error('Error checking match status:', error);
    }
  };

  const handleSendMessage = async () => {
    if (isMatch) {
      navigate('/messages');
    } else {
      toast({
        title: "Chưa thể nhắn tin",
        description: "Bạn cần kết nối với người này trước",
        variant: "destructive",
      });
    }
  };

  const handleAddFriend = async () => {
    try {
      // Check if already sent request
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user?.id})`)
        .single();

      if (existingMatch) {
        toast({
          title: "Đã gửi lời mời",
          description: "Bạn đã gửi lời mời kết bạn rồi",
        });
        return;
      }

      const { error } = await supabase
        .from('matches')
        .insert({
          user1_id: user?.id,
          user2_id: userId,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating match:', error);
        toast({
          title: "Lỗi",
          description: "Không thể gửi lời mời",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Đã gửi lời mời!",
        description: `Đã gửi lời mời kết nối tới ${profile?.full_name}`,
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getGenderText = (gender: string) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      case 'other': return 'Khác';
      default: return '';
    }
  };

  const getLookingForText = (lookingFor: string) => {
    switch (lookingFor) {
      case 'friendship': return 'Tìm bạn bè';
      case 'relationship': return 'Tìm mối quan hệ';
      case 'casual': return 'Gặp gỡ thoải mái';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Info className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Không tìm thấy người dùng</h2>
            <p className="text-muted-foreground">
              Người dùng này không tồn tại hoặc đã bị xóa
            </p>
          </div>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Button>
            
            {!isOwnProfile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass">
                  <DropdownMenuItem 
                    onClick={() => setShowReportDialog(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Báo cáo
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowBlockDialog(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Chặn
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="overflow-hidden shadow-glow border-0">
          {/* Photo Gallery */}
          {photos.length > 0 ? (
            <div className="relative">
              <Carousel className="w-full">
                <CarouselContent>
                  {photos.map((photo) => (
                    <CarouselItem key={photo.id}>
                      <div className="aspect-[4/5] overflow-hidden">
                        <img
                          src={photo.url}
                          alt={profile.full_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {photos.length > 1 && (
                  <>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </>
                )}
              </Carousel>
              
              {/* Photo count indicator */}
              <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {photos.length} ảnh
              </div>
            </div>
          ) : (
            <div className="aspect-[4/5] bg-muted flex items-center justify-center">
              <Camera className="w-16 h-16 text-muted-foreground" />
            </div>
          )}

          <CardContent className="p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                {profile.age && (
                  <div className="flex items-center gap-1">
                    <Cake className="w-4 h-4" />
                    <span>{profile.age} tuổi</span>
                  </div>
                )}
                {profile.gender && (
                  <Badge variant="secondary">
                    {getGenderText(profile.gender)}
                  </Badge>
                )}
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Giới thiệu
                </h3>
                <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Looking For */}
            {profile.looking_for && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Mục đích
                </h3>
                <Badge variant="outline" className="text-sm">
                  {getLookingForText(profile.looking_for)}
                </Badge>
              </div>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Sở thích</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Member Since */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Thành viên từ {new Date(profile.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <div className="flex gap-4 pt-4">
                {isMatch ? (
                  <Button
                    onClick={handleSendMessage}
                    className="flex-1 bg-gradient-primary"
                    size="lg"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Nhắn tin
                  </Button>
                ) : (
                  <Button
                    onClick={handleAddFriend}
                    className="flex-1"
                    variant="outline"
                    size="lg"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Kết nối
                  </Button>
                )}
              </div>
            )}

            {isOwnProfile && (
              <Button
                onClick={() => navigate('/profile')}
                className="w-full"
                size="lg"
              >
                Chỉnh sửa hồ sơ
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        reportedUserId={userId || ''}
        reportedUserName={profile.full_name}
      />

      {/* Block Dialog */}
      <BlockDialog
        isOpen={showBlockDialog}
        onClose={() => setShowBlockDialog(false)}
        blockedUserId={userId || ''}
        blockedUserName={profile.full_name}
        onBlockComplete={() => navigate(-1)}
      />
    </div>
  );
};

export default UserProfile;
