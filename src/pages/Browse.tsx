import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, UserPlus, ArrowLeft, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  age: number;
  bio: string;
  location: string;
  gender: string;
  avatar_url: string;
}

const Browse = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      
      // Search by user ID or name
      let query = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          age,
          bio,
          location,
          gender,
          avatar_url
        `)
        .neq('user_id', user?.id);

      // Check if search query is a UUID (user ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQuery);
      
      if (isUUID) {
        query = query.eq('user_id', searchQuery);
      } else {
        query = query.ilike('full_name', `%${searchQuery}%`);
      }

      const { data: profilesData, error } = await query.limit(10);

      if (error) {
        console.error('Error searching users:', error);
        toast({
          title: "Lỗi",
          description: "Không thể tìm kiếm người dùng",
          variant: "destructive",
        });
        return;
      }

      setSearchResults(profilesData || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tìm kiếm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (targetProfile: Profile) => {
    try {
      // Check if a match already exists
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${targetProfile.user_id}),and(user1_id.eq.${targetProfile.user_id},user2_id.eq.${user?.id})`)
        .single();

      if (existingMatch) {
        toast({
          title: "Đã gửi lời mời",
          description: "Bạn đã gửi lời mời kết bạn cho người này rồi",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('matches')
        .insert({
          user1_id: user?.id,
          user2_id: targetProfile.user_id,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating friend request:', error);
        toast({
          title: "Lỗi",
          description: "Không thể gửi lời mời kết bạn",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Đã gửi lời mời!",
        description: `Đã gửi lời mời kết bạn cho ${targetProfile.full_name}`,
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchUsers();
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
                Quay lại
              </Button>
              <h1 className="text-lg font-semibold">Thêm bạn</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Tìm kiếm người dùng</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Nhập ID hoặc tên người dùng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={searchUsers} disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Bạn có thể tìm kiếm bằng ID người dùng hoặc tên
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Đang tìm kiếm...</p>
            </div>
          )}

          {/* Search Results */}
          {!loading && searchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Kết quả tìm kiếm</h3>
              <div className="space-y-3">
                {searchResults.map((profile) => (
                  <Card key={profile.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Camera className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{profile.full_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {profile.age && <span>{profile.age} tuổi</span>}
                          {profile.gender && <span>• {getGenderText(profile.gender)}</span>}
                        </div>
                        {profile.location && (
                          <p className="text-sm text-muted-foreground truncate">{profile.location}</p>
                        )}
                        {profile.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{profile.bio}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddFriend(profile)}
                        className="gap-2 flex-shrink-0"
                      >
                        <UserPlus className="w-4 h-4" />
                        Thêm bạn
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searchQuery && searchResults.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Không tìm thấy kết quả</h3>
              <p className="text-muted-foreground">
                Không tìm thấy người dùng nào phù hợp với từ khóa tìm kiếm.
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !searchQuery && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Tìm kiếm bạn bè</h3>
              <p className="text-muted-foreground">
                Nhập ID hoặc tên người dùng để tìm và kết bạn với họ.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Browse;