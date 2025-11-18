import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { Camera, X, Plus, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vietnamProvinces } from '@/data/vietnamProvinces';
import { v4 as uuidv4 } from 'uuid';

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

const useProfilePhotos = (userId: string | undefined) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = useCallback(async () => {
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
      // Do not toast here to avoid loops
    }
  }, [userId]);

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn file ảnh', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: 'Lỗi', description: 'Kích thước ảnh không được vượt quá 5MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      await supabase.storage.from('user-photos').upload(fileName, file);
      const { data: urlData } = supabase.storage.from('user-photos').getPublicUrl(fileName);
      await supabase.from('photos').insert([{ user_id: userId, url: urlData.publicUrl, is_primary: photos.length === 0 }]);
      await fetchPhotos();
      toast({ title: 'Thành công', description: 'Ảnh đã được tải lên' });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({ title: 'Lỗi', description: 'Không thể tải ảnh lên', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [userId, photos.length, toast, fetchPhotos]);

  const handleDeletePhoto = useCallback(async (photoId: string, photoUrl: string) => {
    try {
      const urlParts = photoUrl.split('/user-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('user-photos').remove([filePath]);
      }
      await supabase.from('photos').delete().eq('id', photoId);
      await fetchPhotos();
      toast({ title: 'Thành công', description: 'Ảnh đã được xóa' });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({ title: 'Lỗi', description: 'Không thể xóa ảnh', variant: 'destructive' });
    }
  }, [toast, fetchPhotos]);

  return { photos, uploading, fetchPhotos, handlePhotoUpload, handleDeletePhoto };
};

const ProfileForm = ({ profile, setProfile, handleSaveProfile, saving }: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  handleSaveProfile: () => void;
  saving: boolean;
}) => {
  const [newInterest, setNewInterest] = useState('');
  const { toast } = useToast();

  const addInterest = () => {
    if (!newInterest.trim() || !profile) return;
    const currentInterests = profile.interests || [];
    if (currentInterests.includes(newInterest.trim())) {
      return toast({ title: 'Thông báo', description: 'Sở thích này đã tồn tại', variant: 'destructive' });
    }
    if (currentInterests.length >= 10) {
      return toast({ title: 'Lỗi', description: 'Tối đa 10 sở thích', variant: 'destructive' });
    }
    if (newInterest.trim().length > 30) {
      return toast({ title: 'Lỗi', description: 'Sở thích tối đa 30 ký tự', variant: 'destructive' });
    }
    setProfile({ ...profile, interests: [...currentInterests, newInterest.trim()] });
    setNewInterest('');
  };

  const removeInterest = (interest: string) => {
    if (!profile) return;
    setProfile({ ...profile, interests: profile.interests?.filter(i => i !== interest) || [] });
  };

  const handleBirthDateChange = (date: Date | undefined) => {
    if (!date || !profile) return;
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

  if (!profile) return null;

  return (
    <>
      <Card>
        <CardHeader><CardTitle>Thông tin cơ bản</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fullName">Tên đầy đủ</Label>
            <Input id="fullName" value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Nhập tên của bạn" maxLength={50} />
          </div>
          <div>
            <Label>Giới tính</Label>
            <RadioGroup value={profile.gender || ''} onValueChange={(value) => setProfile({ ...profile, gender: value })} className="flex flex-row space-x-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Nam</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Nữ</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="other" id="other" /><Label htmlFor="other">Khác</Label></div>
            </RadioGroup>
          </div>
          <div>
            <Label>Ngày sinh</Label>
            <DatePicker date={profile.birth_date ? new Date(profile.birth_date) : undefined} onDateChange={handleBirthDateChange} placeholder="Chọn ngày sinh" disabled={(date) => date > new Date() || date < new Date('1900-01-01')} />
          </div>
          <div>
            <Label htmlFor="age">Tuổi</Label>
            <Input id="age" type="number" value={profile.age || ''} placeholder="Tuổi sẽ được tính tự động" disabled />
          </div>
          <div>
            <Label htmlFor="location">Địa điểm</Label>
            <Select value={profile.location || ''} onValueChange={(value) => setProfile({ ...profile, location: value })}>
              <SelectTrigger><SelectValue placeholder="Chọn tỉnh/thành phố" /></SelectTrigger>
              <SelectContent>
                {Object.entries(groupedProvinces).map(([newProvince, provinces]) => (
                  <SelectGroup key={newProvince}>
                    <SelectLabel>{newProvince}</SelectLabel>
                    {provinces.map((province) => <SelectItem key={province} value={province}>{province}</SelectItem>)}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bio">Giới thiệu bản thân</Label>
            <Textarea id="bio" value={profile.bio || ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Hãy kể về bản thân bạn..." rows={4} maxLength={500} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tìm kiếm kết nối</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="lookingFor">Loại kết nối mong muốn</Label>
            <Select value={profile.looking_for || ''} onValueChange={(value) => setProfile({ ...profile, looking_for: value })}>
              <SelectTrigger><SelectValue placeholder="Chọn loại kết nối" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="friendship">Bạn bè</SelectItem>
                <SelectItem value="relationship">Hẹn hò</SelectItem>
                <SelectItem value="casual">Gặp gỡ thoải mái</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Đối tượng muốn kết nối</Label>
            <RadioGroup value={profile.looking_for_gender || ''} onValueChange={(value) => setProfile({ ...profile, looking_for_gender: value })} className="flex flex-row space-x-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="looking-male" /><Label htmlFor="looking-male">Nam</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="looking-female" /><Label htmlFor="looking-female">Nữ</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="both" id="looking-both" /><Label htmlFor="looking-both">Cả hai</Label></div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sở thích</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={newInterest} onChange={(e) => setNewInterest(e.target.value)} placeholder="Thêm sở thích mới" onKeyPress={(e) => e.key === 'Enter' && addInterest()} maxLength={30} />
            <Button onClick={addInterest} variant="outline"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.interests?.map((interest, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground" onClick={() => removeInterest(interest)}>{interest}<X className="h-3 w-3 ml-1" /></Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSaveProfile} disabled={saving} size="lg" className="w-full">
        {saving ? 'Đang lưu...' : <><Save className="h-5 w-5 mr-2" />Lưu thông tin</>}
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
  const [saving, setSaving] = useState(false);
  const { photos, uploading, fetchPhotos, handlePhotoUpload, handleDeletePhoto } = useProfilePhotos(user?.id);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchOrCreateProfile = async () => {
      setLoading(true);
      try {
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (existingProfile) {
          setProfile(existingProfile);
        } else if (fetchError && fetchError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ id: uuidv4(), user_id: user.id, full_name: user.user_metadata?.full_name || 'Người dùng mới' }])
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile);
        } else if (fetchError) {
          throw fetchError;
        }
      } catch (error) {
        console.error('Error fetching/creating profile:', error);
        toast({ title: 'Lỗi', description: 'Không thể tải thông tin hồ sơ của bạn.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateProfile();
  }, [user, navigate, toast]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);


  const handleSaveProfile = useCallback(async () => {
    if (!profile || !user) return;

    const validationError = (p: Profile) => {
      if (!p.full_name || p.full_name.length > 50 || !/^[a-zA-Z\sÀ-ỹ]*$/.test(p.full_name)) return 'Tên không hợp lệ';
      if (p.bio && p.bio.length > 500) return 'Giới thiệu tối đa 500 ký tự';
      if (p.interests && p.interests.length > 10) return 'Tối đa 10 sở thích';
      return null;
    };

    const error = validationError(profile);
    if (error) {
      return toast({ title: 'Lỗi', description: error, variant: 'destructive' });
    }

    setSaving(true);
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ ...profile })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      setProfile(data);
      toast({ title: 'Thành công', description: 'Hồ sơ của bạn đã được cập nhật.' });
    } catch (e) {
      console.error('Error saving profile:', e);
      toast({ title: 'Lỗi', description: 'Không thể lưu hồ sơ.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [profile, user, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/user/${user?.id}`)} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Chỉnh sửa hồ sơ</h1>
          <div className="w-10" />
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Ảnh của bạn</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group aspect-square">
                  <img src={photo.url} alt="User Photo" className="w-full h-full object-cover rounded-lg" />
                  {photo.is_primary && <Badge className="absolute top-1 left-1">Chính</Badge>}
                  <Button size="sm" variant="destructive" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto" onClick={() => handleDeletePhoto(photo.id, photo.url)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="border-2 border-dashed rounded-lg aspect-square flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  {uploading ? (
                    <div className="text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-1"></div><span className="text-xs text-muted-foreground">Đang tải...</span></div>
                  ) : (
                    <div className="text-center"><Plus className="h-6 w-6 text-muted-foreground mx-auto mb-1" /><span className="text-xs text-muted-foreground">Thêm ảnh</span></div>
                  )}
                </label>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Bạn có thể thêm tối đa 6 ảnh. Ảnh đầu tiên sẽ là ảnh chính.</p>
          </CardContent>
        </Card>

        {profile && <ProfileForm profile={profile} setProfile={setProfile} handleSaveProfile={handleSaveProfile} saving={saving} />}
      </div>
    </div>
  );
}
