import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, X, ArrowLeft, MapPin, Calendar, Sparkles, Camera, Filter, MoreVertical, Flag, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdvancedFilters } from '@/components/AdvancedFilters';
import { ReportDialog } from '@/components/ReportDialog';
import { BlockDialog } from '@/components/BlockDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

interface FilterSettings {
  ageRange: [number, number];
  distance: number;
  gender: string;
  location: string;
  interests: string[];
  showOnlyVerified: boolean;
  showOnlyWithPhotos: boolean;
}

const Discover = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [filters, setFilters] = useState<FilterSettings>({
    ageRange: [18, 65],
    distance: 50,
    gender: 'all',
    location: '',
    interests: [],
    showOnlyVerified: false,
    showOnlyWithPhotos: true
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = async (appliedFilters?: FilterSettings) => {
    try {
      setLoading(true);
      const currentFilters = appliedFilters || filters;
      
      // Build query with filters
      let query = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          age,
          bio,
          location,
          interests,
          avatar_url,
          gender
        `)
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false });

      // Apply age filter
      if (currentFilters.ageRange[0] > 18 || currentFilters.ageRange[1] < 65) {
        query = query
          .gte('age', currentFilters.ageRange[0])
          .lte('age', currentFilters.ageRange[1]);
      }

      // Apply gender filter
      if (currentFilters.gender !== 'all') {
        query = query.eq('gender', currentFilters.gender);
      }

      // Apply location filter
      if (currentFilters.location) {
        query = query.eq('location', currentFilters.location);
      }

      const { data: profilesData, error: profilesError } = await query.limit(50);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách hồ sơ",
          variant: "destructive",
        });
        return;
      }

      // Fetch photos for each profile and apply additional filters
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

      // Apply client-side filters
      let filteredProfiles = profilesWithPhotos;

      // Filter by photos requirement
      if (currentFilters.showOnlyWithPhotos) {
        filteredProfiles = filteredProfiles.filter(p => p.photos.length > 0);
      }

      // Filter by interests
      if (currentFilters.interests.length > 0) {
        filteredProfiles = filteredProfiles.filter(p => 
          p.interests && currentFilters.interests.some(interest => 
            p.interests.includes(interest)
          )
        );
      }

      setProfiles(filteredProfiles);
      setCurrentIndex(0); // Reset to first profile
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

  const handleApplyFilters = (newFilters: FilterSettings) => {
    setFilters(newFilters);
    fetchProfiles(newFilters);
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

  const handleBlockComplete = () => {
    // Move to next profile after blocking
    setCurrentIndex(prev => prev + 1);
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b">
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
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Bộ lọc
              </Button>
              <div className="text-sm text-muted-foreground">
                {currentIndex + 1} / {profiles.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md animate-scale-in">
        <Card className="overflow-hidden shadow-glow border-0 card-hover">
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
              <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                {currentProfile.photos.length} ảnh
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Profile actions menu */}
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="bg-black/50 text-white hover:bg-black/70">
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
            </div>
            
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
        <div className="flex justify-center gap-8 mt-8">
          <Button
            size="lg"
            variant="outline"
            className="w-20 h-20 rounded-full border-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive hover:scale-110 transition-all shadow-card"
            onClick={() => handleAction('pass')}
            disabled={actionLoading}
          >
            <X className="w-8 h-8" />
          </Button>
          
          <Button
            size="lg"
            variant="hero"
            className="w-20 h-20 rounded-full bg-gradient-primary border-0 shadow-glow hover:scale-110"
            onClick={() => handleAction('like')}
            disabled={actionLoading}
          >
            <Heart className="w-8 h-8" />
          </Button>
        </div>

        <div className="text-center mt-4 text-sm text-muted-foreground">
          Vuốt hoặc bấm để tiếp tục
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filters}
      />

      {/* Report Dialog */}
      {currentProfile && (
        <ReportDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          reportedUserId={currentProfile.user_id}
          reportedUserName={currentProfile.full_name}
        />
      )}

      {/* Block Dialog */}
      {currentProfile && (
        <BlockDialog
          isOpen={showBlockDialog}
          onClose={() => setShowBlockDialog(false)}
          blockedUserId={currentProfile.user_id}
          blockedUserName={currentProfile.full_name}
          onBlockComplete={handleBlockComplete}
        />
      )}
    </div>
  );
};

export default Discover;