import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Calendar, MessageCircle, Flag, Edit, UserX, ArrowLeft, MoreHorizontal, UserCheck, UserPlus, Fingerprint, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { parseISO } from 'date-fns';
import PostFeed from '@/components/posts/PostFeed';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BlockDialog } from '@/components/BlockDialog';
import SocialConnections, { SocialUser } from '@/components/common/SocialConnections';

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
        case 'serious_relationship': return 'Mối quan hệ nghiêm túc';
        case 'networking': return 'Mở rộng mối quan hệ';
        default: return 'Chưa cập nhật';
    }
};

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

          const { data: photoData, error: photoError } = await supabase.from('photos').select('*').eq('user_id', userId).order('is_primary', { ascending: false });
          if (photoError) { toast({ title: 'Lỗi', description: 'Không thể tải ảnh.', variant: 'destructive'}); }
          setPhotos(photoData || []);

          const { data: followsData, error: followsError } = await supabase.from('follows').select('follower_id, following_id').or(`follower_id.eq.${userId},following_id.eq.${userId}`);
          if (followsError) { toast({ title: 'Lỗi', description: 'Không thể tải thông tin mạng xã hội.', variant: 'destructive'}); }
          
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
                const { data: socialProfiles, error: socialProfilesError } = await supabase
                    .from('profiles')
                    .select('user_id, full_name, avatar_url')
                    .in('user_id', allSocialIds);

                if (socialProfilesError) throw new Error('Không thể tải thông tin bạn bè.');

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
            // Try to find an existing match in either direction
            const { data: match1, error: error1 } = await supabase
                .from('matches')
                .select('id')
                .match({ user1_id: currentUser.id, user2_id: userId })
                .maybeSingle();

            if (error1) throw error1;
            if (match1) {
                navigate(`/messages?match_id=${match1.id}`);
                return;
            }

            const { data: match2, error: error2 } = await supabase
                .from('matches')
                .select('id')
                .match({ user1_id: userId, user2_id: currentUser.id })
                .maybeSingle();

            if (error2) throw error2;
            if (match2) {
                navigate(`/messages?match_id=${match2.id}`);
                return;
            }

            // If no match exists, create a new one
            const { data: newMatch, error: newMatchError } = await supabase
                .from('matches')
                .insert({ user1_id: currentUser.id, user2_id: userId, status: 'matched' })
                .select('id')
                .single();

            if (newMatchError) throw newMatchError;
            
            navigate(`/messages?match_id=${newMatch.id}`);

        } catch (error) {
            console.error("Error navigating to messages:", error);
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
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
                 <Button variant="ghost" onClick={() => navigate('/')} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Quay về</Button>
                <h2 className="text-2xl font-bold mb-4">Không tìm thấy người dùng</h2>
                <p className="text-muted-foreground">Người dùng này không tồn tại hoặc bạn không có quyền xem hồ sơ của họ.</p>
            </div>
        );
    }
    
    const primaryPhoto = photos.find(p => p.is_primary)?.url || photos[0]?.url || profile.avatar_url || 'https://placehold.co/400';
    const otherPhotos = photos.filter(p => p.url !== primaryPhoto);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <BlockDialog isOpen={isBlockDialogOpen} onClose={() => setIsBlockDialogOpen(false)} blockedUserId={userId!} blockedUserName={profile.full_name} onBlockComplete={() => { setIsBlockDialogOpen(false); fetchProfileData(); }} />
            <div className="container mx-auto max-w-4xl p-4">
                <div className="mb-4"><Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Quay lại</Button></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-4">
                        <Card>
                            <CardContent className="p-2">
                                <img src={primaryPhoto} alt={`Ảnh đại diện của ${profile.full_name}`} className="w-full h-auto rounded-lg object-cover aspect-square" />
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-3 gap-2">
                            {otherPhotos.slice(0, 6).map(photo => (
                                <Card key={photo.id}>
                                    <CardContent className="p-1">
                                        <img src={photo.url} alt="Ảnh phụ" className="w-full h-auto rounded-md object-cover aspect-square" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <SocialConnections friends={friends} followers={followers} following={following} />
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className='w-full'>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-3xl font-bold">{profile.full_name}, {profile.age}</CardTitle>
                                            {isOwnProfile && (<Button variant="outline" size="icon" onClick={() => navigate('/profile')}><Edit className="h-4 w-4" /></Button>)}
                                        </div>
                                        <div className="flex items-center text-sm text-muted-foreground mt-2"><MapPin className="h-4 w-4 mr-2" /><span>{profile.location ? profile.location.split(' (')[0] : 'Chưa cập nhật'}</span></div>
                                        <div className="flex items-center text-sm text-muted-foreground mt-1"><Fingerprint className="h-4 w-4 mr-2 text-muted-foreground"/> <span>@{profile.user_id.substring(0, 8)}</span></div>
                                        {isFriend && <Badge variant="secondary" className="mt-2">Bạn bè</Badge>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 pt-4 text-center">
                                     <div className="cursor-pointer hover:bg-muted p-2 rounded-md"><p className='font-bold text-lg'>{followersCount}</p><p className='text-xs text-muted-foreground'>Người theo dõi</p></div>
                                     <div className="cursor-pointer hover:bg-muted p-2 rounded-md"><p className='font-bold text-lg'>{followingCount}</p><p className='text-xs text-muted-foreground'>Đang theo dõi</p></div>
                                </div>
                            </CardHeader>
                            <CardContent><p className="text-foreground/80">{profile.bio || 'Chưa có giới thiệu bản thân.'}</p></CardContent>
                            {!isOwnProfile && (
                                <CardFooter className="flex gap-2 p-4">
                                    <Button size="lg" variant={isFollowing ? 'outline' : 'default'} className="flex-1" onClick={handleFollowToggle} disabled={isBlocked}> 
                                        {isFollowing ? <UserCheck className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />} {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                                    </Button>
                                    <Button size="lg" variant='secondary' className="flex-1" onClick={handleNavigateToMessages} disabled={isBlocked}><MessageCircle className="mr-2 h-4 w-4" /> Nhắn tin</Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={handleBlockOptionSelect} className="text-red-600 focus:text-red-500"><UserX className="mr-2 h-4 w-4" /> {isBlocked ? 'Bỏ chặn' : 'Chặn'} người dùng</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => toast({title: 'Tính năng sắp ra mắt'})}><Flag className="mr-2 h-4 w-4" /> Báo cáo người dùng</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardFooter>
                            )}
                        </Card>

                         <Card>
                            <CardHeader><CardTitle>Thông tin chi tiết</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="flex items-center"><UserPlus className="h-4 w-4 mr-2 text-muted-foreground"/> <span>{getGenderText(profile.gender)}</span></div>
                                {profile.birth_date && <div className="flex items-center"><Calendar className="h-4 w-4 mr-2 text-muted-foreground"/> <span>{format(parseISO(profile.birth_date), 'dd/MM/yyyy')}</span></div>}
                                {isOwnProfile && profile.looking_for && (
                                    <div className="flex items-center"><Heart className="h-4 w-4 mr-2 text-muted-foreground"/> <span>{getLookingForText(profile.looking_for)}</span></div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Sở thích</CardTitle></CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {profile.interests && profile.interests.length > 0 ? (
                                    profile.interests.map(interest => (
                                        <Badge key={interest} variant="outline">{interest}</Badge>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">Chưa cập nhật sở thích.</p>
                                )}
                            </CardContent>
                        </Card>

                        {isBlocked ? (
                             <Card className="text-center p-6 bg-secondary"><p className="text-muted-foreground">Bạn đã chặn người dùng này. Bỏ chặn để xem các bài viết của họ.</p></Card>
                        ) : (
                             <div>
                                <Separator className="my-8" />
                                <h2 className="text-2xl font-bold mb-4">Bài viết</h2>
                                {userId && <PostFeed userId={userId} isOwnProfile={isOwnProfile} />}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
