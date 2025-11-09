import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus, ArrowLeft, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdvancedSearchFilters, { SearchFilters } from '@/components/AdvancedSearchFilters';

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
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchQuery: '',
    ageMin: 18,
    ageMax: 65,
    maxDistance: 50,
    gender: 'all',
    interests: []
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const searchUsers = async () => {
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
          gender,
          avatar_url,
          interests
        `)
        .neq('user_id', user?.id);

      // Search by name or user ID
      if (filters.searchQuery.trim()) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.searchQuery);
        
        if (isUUID) {
          query = query.eq('user_id', filters.searchQuery);
        } else {
          query = query.ilike('full_name', `%${filters.searchQuery}%`);
        }
      }

      // Age filter
      if (filters.ageMin > 18 || filters.ageMax < 65) {
        query = query.gte('age', filters.ageMin).lte('age', filters.ageMax);
      }

      // Gender filter
      if (filters.gender !== 'all') {
        query = query.eq('gender', filters.gender);
      }

      const { data: profilesData, error } = await query.limit(20);

      if (error) {
        console.error('Error searching users:', error);
        toast({
          title: "Lỗi",
          description: "Không thể tìm kiếm người dùng",
          variant: "destructive",
        });
        return;
      }

      // Client-side filtering for interests
      let filteredResults = profilesData || [];
      
      if (filters.interests.length > 0) {
        filteredResults = filteredResults.filter(profile => {
          if (!profile.interests || !Array.isArray(profile.interests)) return false;
          return filters.interests.some(interest => 
            profile.interests.includes(interest)
          );
        });
      }

      setSearchResults(filteredResults);
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

      {/* Search & Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <AdvancedSearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={searchUsers}
            loading={loading}
          />

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
                  <Card key={profile.id} className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0"
                        onClick={() => navigate(`/user/${profile.user_id}`)}
                      >
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
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => navigate(`/user/${profile.user_id}`)}
                      >
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddFriend(profile);
                        }}
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
          {!loading && searchResults.length === 0 && (filters.searchQuery || filters.ageMin > 18 || filters.ageMax < 65 || filters.gender !== 'all' || filters.interests.length > 0) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Không tìm thấy kết quả</h3>
              <p className="text-muted-foreground">
                Không tìm thấy người dùng nào phù hợp với bộ lọc đã chọn.
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && searchResults.length === 0 && !filters.searchQuery && filters.ageMin === 18 && filters.ageMax === 65 && filters.gender === 'all' && filters.interests.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Tìm kiếm bạn bè</h3>
              <p className="text-muted-foreground">
                Sử dụng bộ lọc để tìm kiếm người dùng phù hợp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Browse;