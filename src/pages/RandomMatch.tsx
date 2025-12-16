import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, X, ArrowLeft, MapPin, Sparkles, Camera, Zap, Shuffle, SlidersHorizontal, ChevronLeft, ChevronRight, Info, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  age: number;
  bio: string;
  location: string;
  interests: string[];
  avatar_url: string;
  gender: string;
  photos: Array<{
    id: string;
    url: string;
    is_primary: boolean;
  }>;
}

const SWIPE_THRESHOLD = 100;

const RandomMatch = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [matchFound, setMatchFound] = useState<Profile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 65]);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Motion values for swipe
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  useEffect(() => {
    if (user) {
      fetchRandomProfiles();
    }
  }, [user]);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [currentIndex]);

  const fetchRandomProfiles = async () => {
    try {
      setLoading(true);
      
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

      query = query.gte('age', ageRange[0]).lte('age', ageRange[1]);

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

      const shuffledProfiles = (profilesData || []).sort(() => Math.random() - 0.5);

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

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeX = info.offset.x;
    
    if (Math.abs(swipeX) > SWIPE_THRESHOLD) {
      const action = swipeX > 0 ? 'like' : 'pass';
      setExitDirection(swipeX > 0 ? 'right' : 'left');
      handleAction(action);
    }
  };

  const handleAction = async (action: 'like' | 'pass') => {
    if (currentIndex >= profiles.length || actionLoading) return;
    
    const targetProfile = profiles[currentIndex];
    setActionLoading(true);
    setExitDirection(action === 'like' ? 'right' : 'left');

    try {
      if (action === 'like') {
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('*')
          .eq('user1_id', targetProfile.user_id)
          .eq('user2_id', user?.id)
          .eq('status', 'pending')
          .single();

        if (existingMatch) {
          await supabase
            .from('matches')
            .update({ status: 'matched' })
            .eq('id', existingMatch.id);

          setTimeout(() => {
            setMatchFound(targetProfile);
          }, 300);
          
        } else {
          await supabase
            .from('matches')
            .insert({
              user1_id: user?.id,
              user2_id: targetProfile.user_id,
              status: 'pending'
            });

          toast({
            title: "💖 Đã thích!",
            description: `Bạn đã thích ${targetProfile.full_name}`,
          });
        }
      }

      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setExitDirection(null);
        x.set(0);
        
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
      setExitDirection(null);
    } finally {
      setActionLoading(false);
    }
  };

  const nextPhoto = () => {
    const currentProfile = profiles[currentIndex];
    if (currentProfile && currentPhotoIndex < currentProfile.photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center">
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div 
            className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-lg font-medium text-foreground">Đang tìm kiếm...</p>
          <p className="text-sm text-muted-foreground">Chuẩn bị những kết nối tuyệt vời</p>
        </motion.div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center">
        <motion.div 
          className="text-center space-y-6 max-w-md mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div 
            className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto shadow-lg"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-12 h-12 text-primary-foreground" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Hết rồi!</h2>
            <p className="text-muted-foreground">
              Bạn đã xem hết tất cả hồ sơ. Hãy quay lại sau để khám phá thêm!
            </p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={fetchRandomProfiles} 
              className="w-full"
              size="lg"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Tìm kiếm lại
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Header */}
      <motion.div 
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Random Match</span>
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Zap className="w-3 h-3" />
                {profiles.length - currentIndex}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
                className="gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Bộ lọc</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRandomProfiles}
              >
                <Shuffle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="relative h-[550px] sm:h-[600px]">
          <AnimatePresence mode="popLayout">
            {/* Current Card */}
            <motion.div
              key={currentIndex}
              className="absolute inset-0"
              style={{ x, rotate }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ 
                x: exitDirection === 'right' ? 300 : exitDirection === 'left' ? -300 : 0,
                opacity: 0,
                transition: { duration: 0.3 }
              }}
              whileTap={{ cursor: 'grabbing' }}
            >
              <Card className="h-full overflow-hidden shadow-2xl border-0 cursor-grab active:cursor-grabbing bg-card">
                {/* Photo Section */}
                <div className="relative h-[65%] overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentPhotoIndex}
                      src={currentProfile.photos[currentPhotoIndex]?.url || currentProfile.avatar_url}
                      alt={currentProfile.full_name}
                      className="w-full h-full object-cover"
                      draggable={false}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </AnimatePresence>
                  
                  {/* Photo navigation */}
                  {currentProfile.photos.length > 1 && (
                    <>
                      {/* Photo indicators */}
                      <div className="absolute top-3 left-3 right-3 flex gap-1">
                        {currentProfile.photos.map((_, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 h-1 rounded-full transition-all ${
                              idx === currentPhotoIndex 
                                ? 'bg-primary-foreground' 
                                : 'bg-primary-foreground/40'
                            }`}
                          />
                        ))}
                      </div>
                      
                      {/* Navigation buttons */}
                      <button
                        onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-background/40 transition-colors"
                        disabled={currentPhotoIndex === 0}
                        style={{ opacity: currentPhotoIndex === 0 ? 0.3 : 1 }}
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-background/40 transition-colors"
                        disabled={currentPhotoIndex === currentProfile.photos.length - 1}
                        style={{ opacity: currentPhotoIndex === currentProfile.photos.length - 1 ? 0.3 : 1 }}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* LIKE indicator */}
                  <motion.div 
                    className="absolute top-1/2 left-8 -translate-y-1/2 border-4 border-green-500 text-green-500 px-6 py-2 rounded-lg font-bold text-2xl -rotate-12"
                    style={{ opacity: likeOpacity }}
                  >
                    THÍCH
                  </motion.div>
                  
                  {/* NOPE indicator */}
                  <motion.div 
                    className="absolute top-1/2 right-8 -translate-y-1/2 border-4 border-red-500 text-red-500 px-6 py-2 rounded-lg font-bold text-2xl rotate-12"
                    style={{ opacity: nopeOpacity }}
                  >
                    BỎ QUA
                  </motion.div>

                  {/* Gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card to-transparent" />
                  
                  {/* Basic info overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      {currentProfile.full_name}, {currentProfile.age}
                    </h2>
                    {currentProfile.location && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{currentProfile.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <CardContent className="p-4 space-y-3 h-[35%] overflow-y-auto">
                  {/* Bio */}
                  {currentProfile.bio && (
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                      {currentProfile.bio}
                    </p>
                  )}

                  {/* Interests */}
                  {currentProfile.interests && currentProfile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {currentProfile.interests.slice(0, 5).map((interest, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                      {currentProfile.interests.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{currentProfile.interests.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Background card preview */}
          {profiles[currentIndex + 1] && (
            <div className="absolute inset-0 -z-10 transform scale-[0.92] opacity-40">
              <Card className="h-full bg-muted border-0" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <motion.div 
          className="flex justify-center items-center gap-6 mt-6"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            className="w-16 h-16 rounded-full border-2 border-destructive/30 bg-background flex items-center justify-center shadow-lg hover:border-destructive hover:scale-110 transition-all"
            onClick={() => handleAction('pass')}
            disabled={actionLoading}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-8 h-8 text-destructive" />
          </motion.button>
          
          <motion.button
            className="w-14 h-14 rounded-full border-2 border-primary/30 bg-background flex items-center justify-center shadow-lg hover:border-primary hover:scale-105 transition-all"
            onClick={() => navigate(`/user/${currentProfile.user_id}`)}
            whileTap={{ scale: 0.9 }}
          >
            <Info className="w-6 h-6 text-primary" />
          </motion.button>
          
          <motion.button
            className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-xl hover:scale-110 transition-all"
            onClick={() => handleAction('like')}
            disabled={actionLoading}
            whileTap={{ scale: 0.9 }}
          >
            <Heart className="w-8 h-8 text-primary-foreground" />
          </motion.button>
        </motion.div>

        <p className="text-center mt-4 text-xs text-muted-foreground">
          Kéo thẻ hoặc bấm nút để tiếp tục
        </p>
      </div>

      {/* Filters Dialog */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bộ lọc tìm kiếm</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
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
                className="flex-1"
              >
                Áp dụng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Modal */}
      <AnimatePresence>
        {matchFound && (
          <motion.div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <Card className="max-w-sm w-full text-center p-8 border-0 shadow-2xl">
                <div className="space-y-6">
                  <motion.div 
                    className="text-6xl"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    🎉
                  </motion.div>
                  <div className="flex justify-center -space-x-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-background shadow-lg">
                      <img 
                        src={matchFound.photos[0]?.url || matchFound.avatar_url} 
                        alt={matchFound.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">It's a Match!</h2>
                    <p className="text-muted-foreground">
                      Bạn và <span className="font-semibold text-foreground">{matchFound.full_name}</span> đã thích nhau!
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
                      className="flex-1 gap-2"
                      onClick={() => navigate('/messages')}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Nhắn tin
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RandomMatch;
