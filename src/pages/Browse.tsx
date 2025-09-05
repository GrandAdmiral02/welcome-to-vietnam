import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, MapPin, Calendar, Camera, Filter, Grid, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

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

const Browse = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [ageRange, setAgeRange] = useState([18, 65]);
  const [selectedGender, setSelectedGender] = useState('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user, ageRange, selectedGender]);

  const fetchProfiles = async () => {
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
        .gte('age', ageRange[0])
        .lte('age', ageRange[1])
        .order('created_at', { ascending: false });

      // Apply gender filter
      if (selectedGender !== 'all') {
        query = query.eq('gender', selectedGender);
      }

      const { data: profilesData, error: profilesError } = await query.limit(100);

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

      setProfiles(profilesWithPhotos);
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

  const handleLike = async (targetProfile: Profile) => {
    try {
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
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra",
        variant: "destructive",
      });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-4 mt-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Đang tải danh sách người dùng...</p>
          </div>
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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Danh sách
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Grid className="w-4 h-4" />
                <span className="text-sm">{profiles.length} người dùng</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Bộ lọc
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="glass border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Age Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Độ tuổi: {ageRange[0]} - {ageRange[1]} tuổi</Label>
                <Slider
                  value={ageRange}
                  onValueChange={setAgeRange}
                  min={18}
                  max={80}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Gender */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Giới tính</Label>
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
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {profiles.length === 0 ? (
          <div className="text-center space-y-6 max-w-md mx-auto mt-20">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Grid className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Không tìm thấy người dùng</h2>
              <p className="text-muted-foreground">
                Thử điều chỉnh bộ lọc để tìm thêm người dùng phù hợp.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profiles.map((profile) => (
              <Card key={profile.id} className="overflow-hidden shadow-card border-0 card-hover group">
                {/* Photo */}
                <div className="relative aspect-[3/4] overflow-hidden">
                  {profile.photos[0] ? (
                    <img
                      src={profile.photos[0].url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Photo count */}
                  {profile.photos.length > 1 && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs">
                      {profile.photos.length} ảnh
                    </div>
                  )}

                  {/* Like button */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="bg-white/90 text-primary hover:bg-white hover:scale-110 transition-all shadow-lg"
                      onClick={() => handleLike(profile)}
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Basic info */}
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <h3 className="font-semibold text-sm truncate">
                      {profile.full_name}, {profile.age}
                    </h3>
                    {profile.gender && (
                      <p className="text-xs text-white/80">
                        {getGenderText(profile.gender)}
                      </p>
                    )}
                  </div>
                </div>

                <CardContent className="p-3 space-y-2">
                  {/* Location */}
                  {profile.location && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs truncate">{profile.location}</span>
                    </div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {profile.bio}
                    </p>
                  )}

                  {/* Interests */}
                  {profile.interests && profile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profile.interests.slice(0, 2).map((interest, index) => (
                        <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                          {interest}
                        </Badge>
                      ))}
                      {profile.interests.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          +{profile.interests.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;