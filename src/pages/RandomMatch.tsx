import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, X, ArrowLeft, MapPin, Calendar, Sparkles, Camera, Zap, Star, Shuffle, Filter, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

const RandomMatch = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [matchFound, setMatchFound] = useState<Profile | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 65]);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchRandomProfiles();
    }
  }, [user]);

  const fetchRandomProfiles = async () => {
    try {
      setLoading(true);
      
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
        .not('age', 'is', null)
        .not('bio', 'is', null);

      // Apply age filter
      query = query.gte('age', ageRange[0]).lte('age', ageRange[1]);

      // Apply gender filter
      if (selectedGender !== 'all') {
        query = query.eq('gender', selectedGender);
      }

      const { data: profilesData, error: profilesError } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Shuffle profiles for random order
      const shuffledProfiles = (profilesData || []).sort(() => Math.random() - 0.5);

      // Fetch photos for each profile
      const profilesWithPhotos = await Promise.all(
        shuffledProfiles.map(async (profile) => {
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

      // Filter profiles that have at least one photo
      const profilesWithImages = profilesWithPhotos.filter(p => p.photos.length > 0);
      
      setProfiles(profilesWithImages);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách hồ sơ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setDragOffset({ x: deltaX, y: deltaY });
    
    // Visual feedback for swipe direction
    if (Math.abs(deltaX) > 50) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Determine if swipe was strong enough
    if (Math.abs(dragOffset.x) > 100) {
      const action = dragOffset.x > 0 ? 'like' : 'pass';
      handleAction(action);
    } else {
      // Reset position if swipe wasn't strong enough
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  };

  const handleAction = async (action: 'like' | 'pass') => {
    if (currentIndex >= profiles.length) return;
    
    const targetProfile = profiles[currentIndex];
    setActionLoading(true);

    try {
      if (action === 'like') {
        // Check if the other user already liked us
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('*')
          .eq('user1_id', targetProfile.user_id)
          .eq('user2_id', user?.id)
          .eq('status', 'pending')
          .single();

        if (existingMatch) {
          // It's a match! Update status to matched
          await supabase
            .from('matches')
            .update({ status: 'matched' })
            .eq('id', existingMatch.id);

          setMatchFound(targetProfile);
          
          toast({
            title: "🎉 It's a Match!",
            description: `Bạn và ${targetProfile.full_name} đã kết nối!`,
          });
        } else {
          // Create a new match request
          await supabase
            .from('matches')
            .insert({
              user1_id: user?.id,
              user2_id: targetProfile.user_id,
              status: 'pending'
            });

          toast({
            title: "Đã thích!",
            description: `Bạn đã thích ${targetProfile.full_name}`,
          });
        }
      }

      // Animate card out
      setSwipeDirection(action === 'like' ? 'right' : 'left');
      
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        
        // Load more profiles if running low
        if (currentIndex >= profiles.length - 3) {
          fetchRandomProfiles();
        }
      }, 300);
      
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
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto"></div>
          <p className="text-lg font-medium text-gray-700">Đang tìm kiếm...</p>
          <p className="text-sm text-gray-500">Chuẩn bị những kết nối tuyệt vời</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
            <Shuffle className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-800">Hết rồi!</h2>
            <p className="text-gray-600">
              Bạn đã xem hết tất cả hồ sơ. Hãy quay lại sau để khám phá thêm!
            </p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={fetchRandomProfiles} 
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Tìm kiếm lại
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2 hover:bg-white/50"
            >
              <ArrowLeft className="w-4 h-4" />
              Random Match
            </Button>
            <div className="flex items-center gap-4">
              <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">
                <Zap className="w-3 h-3 mr-1" />
                {profiles.length - currentIndex} còn lại
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
                className="gap-2 hover:bg-white/50"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Bộ lọc
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRandomProfiles}
                className="gap-2 hover:bg-white/50"
              >
                <Shuffle className="w-4 h-4" />
                Làm mới
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="relative h-[600px] perspective-1000">
          {/* Current Card */}
          <Card 
            ref={cardRef}
            className={`absolute inset-0 overflow-hidden shadow-2xl border-0 cursor-grab active:cursor-grabbing transition-all duration-300 ${
              swipeDirection === 'right' ? 'border-4 border-green-400' : 
              swipeDirection === 'left' ? 'border-4 border-red-400' : ''
            }`}
            style={{
              transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
              opacity: Math.abs(dragOffset.x) > 100 ? 0.7 : 1,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
              backdropFilter: 'blur(10px)'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Photo */}
            <div className="relative h-96 overflow-hidden">
              {currentProfile.photos[0] ? (
                <img
                  src={currentProfile.photos[0].url}
                  alt={currentProfile.full_name}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>
              )}
              
              {/* Photo count indicator */}
              {currentProfile.photos.length > 1 && (
                <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {currentProfile.photos.length} ảnh
                </div>
              )}

              {/* Swipe indicators */}
              {swipeDirection === 'right' && (
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                  <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-xl transform rotate-12">
                    THÍCH
                  </div>
                </div>
              )}
              
              {swipeDirection === 'left' && (
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                  <div className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-xl transform -rotate-12">
                    BỎ QUA
                  </div>
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
                  <p className="text-gray-700 leading-relaxed">{currentProfile.bio}</p>
                </div>
              )}

              {/* Interests */}
              {currentProfile.interests && currentProfile.interests.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-gray-800">Sở thích</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.interests.slice(0, 4).map((interest, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-gray-700 border-0">
                        {interest}
                      </Badge>
                    ))}
                    {currentProfile.interests.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{currentProfile.interests.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Card Preview */}
          {profiles[currentIndex + 1] && (
            <Card className="absolute inset-0 -z-10 transform scale-95 opacity-50 shadow-xl border-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))',
                    backdropFilter: 'blur(5px)'
                  }}>
              <div className="h-96 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <span className="text-gray-500 font-medium">Tiếp theo...</span>
              </div>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-8 mt-8">
          <Button
            size="lg"
            variant="outline"
            className="w-16 h-16 rounded-full border-2 border-red-300 hover:bg-red-50 hover:border-red-400 hover:scale-110 transition-all shadow-lg bg-white/80 backdrop-blur-sm"
            onClick={() => handleAction('pass')}
            disabled={actionLoading}
          >
            <X className="w-8 h-8 text-red-500" />
          </Button>
          
          <Button
            size="lg"
            className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-0 shadow-xl hover:scale-110 transition-all"
            onClick={() => handleAction('like')}
            disabled={actionLoading}
          >
            <Heart className="w-8 h-8 text-white" />
          </Button>
        </div>

        <div className="text-center mt-6 text-sm text-gray-600">
          Kéo thả hoặc bấm nút để tiếp tục
        </div>
      </div>

      {/* Filters Dialog */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bộ lọc tìm kiếm</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Gender Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Giới tính</label>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="male">Nam</SelectItem>
                  <SelectItem value="female">Nữ</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Age Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Độ tuổi: {ageRange[0]} - {ageRange[1]}
              </label>
              <Slider
                min={18}
                max={65}
                step={1}
                value={ageRange}
                onValueChange={(value) => setAgeRange(value as [number, number])}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>18 tuổi</span>
                <span>65 tuổi</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setAgeRange([18, 65]);
                  setSelectedGender('all');
                }}
                className="flex-1"
              >
                Đặt lại
              </Button>
              <Button
                onClick={() => {
                  setShowFilters(false);
                  fetchRandomProfiles();
                }}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
              >
                Áp dụng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Modal */}
      {matchFound && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full text-center p-8 bg-gradient-to-br from-pink-50 to-purple-50 border-0 shadow-2xl">
            <div className="space-y-6">
              <div className="text-6xl">🎉</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">It's a Match!</h2>
                <p className="text-gray-600">
                  Bạn và {matchFound.full_name} đã thích nhau!
                </p>
              </div>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setMatchFound(null)}
                >
                  Tiếp tục
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
                  onClick={() => navigate('/messages')}
                >
                  Nhắn tin
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RandomMatch;