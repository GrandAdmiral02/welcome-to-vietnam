import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { Camera, X, Plus, Heart, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vietnamProvinces } from '@/data/vietnamProvinces';
import { cn } from '@/lib/utils';
import Head from 'next/head'; // Nếu dùng Next.js
import { debounce } from 'lodash';

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
  looking_for_gender: string | null;
}

interface Photo {
  id: string;
  url: string;
  is_primary: boolean;
}

// Custom hook for managing photos
const useProfilePhotos = (userId: string | undefined) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({ title: 'Lỗi', description: 'Không thể tải ảnh', variant: 'destructive' });
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn file ảnh', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Lỗi', description: 'Kích thước ảnh không được vượt quá 5MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('user-photos').getPublicUrl(fileName);
      const { error: dbError } = await supabase
        .from('photos')
        .insert([{ user_id: userId, url: urlData.publicUrl, is_primary: photos.length === 0 }]);

      if (dbError) throw dbError;

      await fetchPhotos();
      toast({ title: 'Thành công', description: 'Ảnh đã được tải lên' });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({ title: 'Lỗi', description: 'Không thể tải ảnh lên', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      const urlParts = photoUrl.split('/user-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('user-photos').remove([filePath]);
      }

      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;

      await fetchPhotos();
      toast({ title: 'Thành công', description: 'Ảnh đã được xóa' });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({ title: 'Lỗi', description: 'Không thể xóa ảnh', variant: 'destructive' });
    }
  };

  return { photos, uploading, fetchPhotos, handlePhotoUpload, handleDeletePhoto };
};

// Component ProfileForm
const ProfileForm = ({ profile, setProfile, handleSaveProfile, saving }: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  handleSaveProfile: () => void;
  saving: boolean;
}) => {
  const [newInterest, setNewInterest] = useState('');
  const { toast } = useToast();

  const addInterest = () => {
    if (!newInterest.trim()) return;
    const currentInterests = profile.interests || [];
    if (currentInterests.includes(newInterest.trim())) {
      toast({ title: 'Thông báo', description: 'Sở thích này đã tồn tại', variant: 'destructive' });
      return;
    }
    if (currentInterests.length >= 10) {
      toast({ title: 'Lỗi', description: 'Tối đa 10 sở thích', variant: 'destructive' });
      return;
    }
    if (newInterest.trim().length > 30) {
      toast({ title: 'Lỗi', description: 'Sở thích tối đa 30 ký tự', variant: 'destructive' });
      return;
    }
    setProfile({ ...profile, interests: [...currentInterests, newInterest.trim()] });
    setNewInterest('');
  };

  const removeInterest = (interest: string) => {
    setProfile({ ...profile, interests: profile.interests?.filter(i => i !== interest) || [] });
  };

  const handleBirthDateChange = (date: Date | undefined) => {
    if (!date) return;
    const formattedDate = format(date, 'yyyy-MM-dd');
    const calculatedAge = calculateAge(formattedDate);
    setProfile({ ...profile, birth_date: formattedDate, age: calculatedAge });
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const groupedProvinces = useMemo(() => {
    return vietnamProvinces.reduce((acc, province) => {
      const provinceName = province.includes('(') ? province.split(' (')[0] : province;
      if (!acc[provinceName]) acc[provinceName] = [];
      acc[provinceName].push(province);
      return acc;
    }, {} as Record<string, string[]>);
  }, []);

  return (
    <>
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fullName">Tên đầy đủ</Label>
            <Input
              id="fullName"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Nhập tên của bạn"
              aria-label="Tên đầy đủ"
              maxLength={50}
            />
          </div>
          <div>
            <Label>Giới tính</Label>
            <RadioGroup
              value={profile.gender || ''}
              onValueChange={(value) => setProfile({ ...profile, gender: value })}
              className="flex flex-row space-x-4"
              aria-label="Chọn giới tính"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nam" id="nam" />
                <Label htmlFor="nam">Nam</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nữ" id="nữ" />
                <Label htmlFor="nữ">Nữ</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label>Ngày sinh</Label>
            <DatePicker
              date={profile.birth_date ? new Date(profile.birth_date) : undefined}
              onDateChange={handleBirthDateChange}
              placeholder="Chọn ngày sinh"
              disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
              aria-label="Chọn ngày sinh"
            />
          </div>
          <div>
            <Label htmlFor="age">Tuổi</Label>
            <Input
              id="age"
              type="number"
              min="18"
              max="100"
              value={profile.age || ''}
              onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || null })}
              placeholder="Tuổi sẽ được tính tự động từ ngày sinh"
              disabled={!!profile.birth_date}
              aria-label="Tuổi"
            />
            {profile.birth_date && (
              <p className="text-sm text-muted-foreground mt-1">
                Tuổi được tính tự động từ ngày sinh
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="location">Địa điểm</Label>
            <Select value={profile.location || ''} onValueChange={(value) => setProfile({ ...profile, location: value })}>
              <SelectTrigger aria-label="Chọn tỉnh/thành phố">
                <SelectValue placeholder="Chọn tỉnh/thành phố" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedProvinces).map(([newProvince, provinces]) => (
                  <optgroup key={newProvince} label={newProvince}>
                    {provinces.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </optgroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bio">Giới thiệu bản thân</Label>
            <Textarea
              id="bio"
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Hãy kể về bản thân bạn..."
              rows={4}
              aria-label="Giới thiệu bản thân"
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* Connection Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Tìm kiếm kết nối</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="lookingFor">Loại kết nối mong muốn</Label>
            <Select value={profile.looking_for || ''} onValueChange={(value) => setProfile({ ...profile, looking_for: value })}>
              <SelectTrigger aria-label="Chọn loại kết nối">
                <SelectValue placeholder="Chọn loại kết nối" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendship">Bạn bè</SelectItem>
                <SelectItem value="dating">Hẹn hò</SelectItem>
                <SelectItem value="serious_relationship">Tình yêu nghiêm túc</SelectItem>
                <SelectItem value="networking">Kết nối công việc</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Đối tượng muốn kết nối</Label>
            <RadioGroup
              value={profile.looking_for_gender || ''}
              onValueChange={(value) => setProfile({ ...profile, looking_for_gender: value })}
              className="flex flex-row space-x-4"
              aria-label="Chọn đối tượng muốn kết nối"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nam" id="looking-nam" />
                <Label htmlFor="looking-nam">Nam</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nữ" id="looking-nữ" />
                <Label htmlFor="looking-nữ">Nữ</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cả hai" id="looking-both" />
                <Label htmlFor="looking-both">Cả hai</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle>Sở thích</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              placeholder="Thêm sở thích mới"
              onKeyPress={(e) => e.key === 'Enter' && addInterest()}
              aria-label="Thêm sở thích"
              maxLength={30}
            />
            <Button onClick={addInterest} variant="outline" aria-label="Thêm sở thích mới">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.interests?.map((interest, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeInterest(interest)}
                aria-label={`Xóa sở thích ${interest}`}
              >
                {interest}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSaveProfile}
        disabled={saving}
        size="lg"
        className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
        aria-label="Lưu thông tin hồ sơ"
      >
        {saving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Đang lưu...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Lưu thông tin
          </>
        )}
      </Button>
    </>
  );
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { photos, uploading, fetchPhotos, handlePhotoUpload, handleDeletePhoto } = useProfilePhotos(user?.id);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile(data);
        } else {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ user_id: user.id, full_name: user?.user_metadata?.full_name || 'New User' }])
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({ title: 'Lỗi', description: 'Không thể tải thông tin profile', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    fetchPhotos();
  }, [user, fetchPhotos, toast, navigate]);

  const validateProfile = (profile: Profile) => {
    if (profile.full_name.length > 50 || !/^[a-zA-Z\sÀ-ỹ]*$/.test(profile.full_name)) {
      return 'Tên đầy đủ không hợp lệ (tối đa 50 ký tự, chỉ chứa chữ cái)';
    }
    if (profile.bio && profile.bio.length > 500) {
      return 'Giới thiệu bản thân tối đa 500 ký tự';
    }
    if (profile.interests && profile.interests.length > 10) {
      return 'Tối đa 10 sở thích';
    }
    if (profile.interests?.some((i) => i.length > 30)) {
      return 'Mỗi sở thích tối đa 30 ký tự';
    }
    return null;
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    const validationError = validateProfile(profile);
    if (validationError) {
      toast({ title: 'Lỗi', description: validationError, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          age: profile.age,
          bio: profile.bio,
          location: profile.location,
          interests: profile.interests,
          looking_for: profile.looking_for,
          gender: profile.gender,
          birth_date: profile.birth_date,
          looking_for_gender: profile.looking_for_gender,
        })
        .eq('user_id', user?.id);

      if (error) throw error;
      toast({ title: 'Thành công', description: 'Profile đã được cập nhật' });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ title: 'Lỗi', description: 'Không thể lưu profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const debouncedSaveProfile = debounce(handleSaveProfile, 500);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-8 w-8 text-rose-500 animate-pulse mx-auto mb-2" aria-hidden="true" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 to-pink-100 p-4">
      <Head>
        <title>Hippo Lovely - Chỉnh sửa hồ sơ</title>
        <meta name="description" content="Chỉnh sửa hồ sơ cá nhân của bạn trên Hippo Lovely để kết nối với những người phù hợp." />
      </Head>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="p-2" aria-label="Quay lại dashboard">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Hồ sơ của tôi</h1>
          <div />
        </div>

        {/* Photos Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" aria-hidden="true" />
              Ảnh của bạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.url}
                    alt="Ảnh người dùng"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {photo.is_primary && (
                    <Badge className="absolute top-2 left-2 bg-rose-500">Chính</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                    onClick={() => handleDeletePhoto(photo.id, photo.url)}
                    aria-label={`Xóa ảnh ${photo.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-rose-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                    aria-label="Tải lên ảnh"
                  />
                  {uploading ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500 mx-auto mb-1"></div>
                      <span className="text-xs text-muted-foreground">Đang tải...</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Plus className="h-6 w-6 text-gray-400 mx-auto mb-1" aria-hidden="true" />
                      <span className="text-xs text-muted-foreground">Thêm ảnh</span>
                    </div>
                  )}
                </label>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Bạn có thể thêm tối đa 6 ảnh. Ảnh đầu tiên sẽ là ảnh chính.
            </p>
          </CardContent>
        </Card>

        <ProfileForm
          profile={profile}
          setProfile={setProfile}
          handleSaveProfile={debouncedSaveProfile}
          saving={loading}
        />
      </div>
    </div>
  );
}
