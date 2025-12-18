import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Calendar, MessageCircle, Flag, Edit, UserX, ArrowLeft, MoreHorizontal, UserCheck, UserPlus, Heart, Sparkles, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PostFeed from '@/components/posts/PostFeed';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BlockDialog } from '@/components/BlockDialog';
import SocialConnections, { SocialUser } from '@/components/common/SocialConnections';
import { motion, AnimatePresence } from 'framer-motion';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  age: number | null;
  bio: string | null;
  location: string | null;
  interests: string[] | null;
  looking_for: string | null;
  avatar_url: string | null;
  gender: string | null;
  birth_date: string | null;
  last_active: string | null;
}

interface Photo {
  id: string;
  url: string;
  is_primary: boolean;
}

const getGenderText = (gender: string | null) => {
  if (gender === 'male') return 'Nam';
  if (gender === 'female') return 'Nữ';
  if (gender === 'other') return 'Khác';
  return 'Không xác định';
};

const getLookingForText = (lookingFor: string | null) => {
  switch (lookingFor) {
    case 'friendship': return 'Tìm bạn bè';
    case 'dating': return 'Hẹn hò';
    case 'relationship': return 'Hẹn hò';
    case 'casual': return 'Gặp gỡ thoải mái';
    case 'serious_relationship': return 'Mối quan hệ nghiêm túc';
    case 'networking': return 'Mở rộng mối quan hệ';
    default: return 'Chưa cập nhật';
  }
};

const PhotoGallery = ({ photos, primaryPhoto }: { photos: Photo[]; primaryPhoto: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const allPhotos = [primaryPhoto, ...photos.filter(p => p.url !== primaryPhoto).map(p => p.url)];
  
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % allPhotos.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);

  return (
    <div className="relative">
      <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-muted">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={allPhotos[currentIndex]}
            alt="Profile"
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>
      </div>
      
      {allPhotos.length > 1 && (
        <>
          <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 px-4">
            {allPhotos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-white' : 'w-4 bg-white/50'}`}
              />
            ))}
          </div>
          
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
};

const StatCard = ({ value, label }: { value: number; label: string }) => (
  <div className="text-center px-4 py-2">
    <p className="text-xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [followers, setFollowers] = useState<SocialUser[]>([]);
  const [following, setFollowing] = useState<SocialUser[]>([]);

  const fetchProfileData = useCallback(async () => {
    const currentUserId = currentUser?.id;
    if (!userId || !currentUserId) return;

    setLoading(true);
    setFriends([]);
    setFollowers([]);
    setFollowing([]);
    try {
      setIsOwnProfile(currentUserId === userId);

      const { data: myBlock } = await supabase.from('blocks').select('blocker_id').match({ blocker_id: currentUserId, blocked_id: userId }).maybeSingle();
      setIsBlocked(!!myBlock);

      const { data: theirBlock } = await supabase.from('blocks').select('blocker_id').match({ blocker_id: userId, blocked_id: currentUserId }).maybeSingle();
      if (theirBlock) {
        setIsBlockedBy(true);
        setProfile(null);
        throw new Error('Người dùng này không tồn tại hoặc đã chặn bạn.');
      }
      setIsBlockedBy(false);
      
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
      if (profileError || !profileData) throw new Error('Không tìm thấy hồ sơ người dùng.');
      setProfile(profileData);

      const { data: photoData } = await supabase.from('photos').select('*').eq('user_id', userId).order('is_primary', { ascending: false });
      setPhotos(photoData || []);

      const { data: followsData } = await supabase.from('follows').select('follower_id, following_id').or(`follower_id.eq.${userId},following_id.eq.${userId}`);
      
      if (followsData) {
        const followersData = followsData.filter(f => f.following_id === userId);
        const followingData = followsData.filter(f => f.follower_id === userId);
        setFollowersCount(followersData.length);
        setFollowingCount(followingData.length);
        const currentUserIsFollowing = followersData.some(f => f.follower_id === currentUserId);
        setIsFollowing(currentUserIsFollowing);
        const targetUserIsFollowing = followingData.some(f => f.following_id === currentUserId);
        setIsFriend(currentUserIsFollowing && targetUserIsFollowing);

        const followerIds = followersData.map(f => f.follower_id);
        const followingIds = followingData.map(f => f.following_id);
        const allSocialIds = [...new Set([...followerIds, ...followingIds])];

        if (allSocialIds.length > 0) {
          const { data: socialProfiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', allSocialIds);

          if (socialProfiles) {
            const socialProfilesMap = new Map<string, SocialUser>(
              socialProfiles.map(p => [p.user_id, { id: p.user_id, full_name: p.full_name, avatar_url: p.avatar_url }])
            );

            const followerUsers = followerIds.map(id => socialProfilesMap.get(id)).filter((u): u is SocialUser => !!u);
            const followingUsers = followingIds.map(id => socialProfilesMap.get(id)).filter((u): u is SocialUser => !!u);
            const friendUsers = followerUsers.filter(follower => followingIds.includes(follower.id));
            
            setFollowers(followerUsers);
            setFollowing(followingUsers);
            setFriends(friendUsers);
          }
        }
      }

    } catch (error: any) {
      setProfile(null);
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
      if (!isBlockedBy) navigate('/');
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.id, navigate, toast, isBlockedBy]);

  useEffect(() => {
    if (currentUser) {
      fetchProfileData();
    }
  }, [fetchProfileData, currentUser]);

  const handleNavigateToMessages = async () => {
    if (!currentUser || !userId) return;
    try {
      const { data: match1 } = await supabase
        .from('matches')
        .select('id')
        .match({ user1_id: currentUser.id, user2_id: userId })
        .maybeSingle();

      if (match1) {
        navigate(`/messages?match_id=${match1.id}`);
        return;
      }

      const { data: match2 } = await supabase
        .from('matches')
        .select('id')
        .match({ user1_id: userId, user2_id: currentUser.id })
        .maybeSingle();

      if (match2) {
        navigate(`/messages?match_id=${match2.id}`);
        return;
      }

      const { data: newMatch, error: newMatchError } = await supabase
        .from('matches')
        .insert({ user1_id: currentUser.id, user2_id: userId, status: 'matched' })
        .select('id')
        .single();

      if (newMatchError) throw newMatchError;
      navigate(`/messages?match_id=${newMatch.id}`);

    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể bắt đầu cuộc trò chuyện.', variant: 'destructive' });
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !userId || isOwnProfile || isBlocked) return;
    const originalFollowingState = isFollowing;
    setIsFollowing(!originalFollowingState);
    setFollowersCount(prev => originalFollowingState ? prev - 1 : prev + 1);
    try {
      if (originalFollowingState) {
        await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: userId });
        setIsFriend(false);
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId });
        const { data: targetFollows } = await supabase.from('follows').select().eq('follower_id', userId).eq('following_id', currentUser.id).maybeSingle();
        if(targetFollows) setIsFriend(true);
      }
      fetchProfileData();
    } catch (error) {
      setIsFollowing(originalFollowingState);
      toast({ title: 'Lỗi', description: 'Không thể thực hiện hành động.', variant: 'destructive' });
    }
  };
  
  const handleUnblock = async () => {
    if (!currentUser || !userId || !isBlocked) return;
    try {
      await supabase.from('blocks').delete().match({ blocker_id: currentUser.id, blocked_id: userId });
      toast({ title: 'Thành công', description: `Bạn đã bỏ chặn ${profile?.full_name}.` });
      fetchProfileData();
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể bỏ chặn người dùng này.', variant: 'destructive' });
    }
  };

  const handleBlockOptionSelect = () => {
    if (isBlocked) handleUnblock();
    else setIsBlockDialogOpen(true);
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <UserX className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Không tìm thấy người dùng</h2>
          <p className="text-muted-foreground max-w-sm">Người dùng này không tồn tại hoặc bạn không có quyền xem hồ sơ của họ.</p>
          <Button variant="outline" onClick={() => navigate('/')}><ArrowLeft className="h-4 w-4 mr-2" />Quay về trang chủ</Button>
        </motion.div>
      </div>
    );
  }
  
  const primaryPhoto = photos.find(p => p.is_primary)?.url || photos[0]?.url || profile.avatar_url || 'https://placehold.co/400';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <BlockDialog isOpen={isBlockDialogOpen} onClose={() => setIsBlockDialogOpen(false)} blockedUserId={userId!} blockedUserName={profile.full_name} onBlockComplete={() => { setIsBlockDialogOpen(false); fetchProfileData(); }} />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Photos & Social */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            <PhotoGallery photos={photos} primaryPhoto={primaryPhoto} />
            
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex justify-around">
                  <StatCard value={friends.length} label="Bạn bè" />
                  <div className="w-px bg-border" />
                  <StatCard value={followersCount} label="Người theo dõi" />
                  <div className="w-px bg-border" />
                  <StatCard value={followingCount} label="Đang theo dõi" />
                </div>
              </CardContent>
            </Card>

            <SocialConnections friends={friends} followers={followers} following={following} />
          </motion.div>

          {/* Right Column - Profile Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-3xl font-bold">{profile.full_name}</CardTitle>
                      {profile.age && <Badge variant="secondary" className="text-base px-3 py-1">{profile.age}</Badge>}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {profile.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {profile.location.split(' (')[0]}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {getGenderText(profile.gender)}
                      </span>
                    </div>
                    
                    {isFriend && (
                      <Badge variant="default" className="bg-gradient-to-r from-pink-500 to-purple-500">
                        <Heart className="h-3 w-3 mr-1" /> Bạn bè
                      </Badge>
                    )}
                  </div>
                  
                  {isOwnProfile && (
                    <Button variant="outline" size="icon" onClick={() => navigate('/profile')}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-foreground/80 leading-relaxed">{profile.bio || 'Chưa có giới thiệu bản thân.'}</p>
              </CardContent>
              
              {!isOwnProfile && (
                <CardFooter className="flex gap-2 p-4 pt-0">
                  <Button 
                    size="lg" 
                    variant={isFollowing ? 'outline' : 'default'} 
                    className="flex-1 h-11" 
                    onClick={handleFollowToggle} 
                    disabled={isBlocked}
                  > 
                    {isFollowing ? <UserCheck className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                  </Button>
                  <Button size="lg" variant='secondary' className="flex-1 h-11" onClick={handleNavigateToMessages} disabled={isBlocked}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Nhắn tin
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-11 w-11">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={handleBlockOptionSelect} className="text-destructive focus:text-destructive">
                        <UserX className="mr-2 h-4 w-4" /> {isBlocked ? 'Bỏ chặn' : 'Chặn'} người dùng
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toast({title: 'Tính năng sắp ra mắt'})}>
                        <Flag className="mr-2 h-4 w-4" /> Báo cáo người dùng
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              )}
            </Card>

            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Thông tin chi tiết</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Giới tính</p>
                    <p className="font-medium">{getGenderText(profile.gender)}</p>
                  </div>
                </div>
                {profile.birth_date && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ngày sinh</p>
                      <p className="font-medium">{format(parseISO(profile.birth_date), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                )}
                {isOwnProfile && profile.looking_for && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 col-span-2">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Mục đích kết nối</p>
                      <p className="font-medium">{getLookingForText(profile.looking_for)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                  </div>
                  <CardTitle className="text-lg">Sở thích</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {profile.interests && profile.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map(interest => (
                      <Badge key={interest} variant="secondary" className="px-3 py-1.5">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa cập nhật sở thích.</p>
                )}
              </CardContent>
            </Card>

            {isBlocked ? (
              <Card className="border-none shadow-lg bg-secondary/50 backdrop-blur-sm text-center p-8">
                <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Bạn đã chặn người dùng này. Bỏ chặn để xem các bài viết của họ.</p>
                <Button variant="outline" className="mt-4" onClick={handleUnblock}>Bỏ chặn</Button>
              </Card>
            ) : (
              <div>
                <Separator className="my-6" />
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Bài viết
                </h2>
                {userId && <PostFeed userId={userId} isOwnProfile={isOwnProfile} />}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
