import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { Camera, X, Plus, Save, ArrowLeft, User, MapPin, Heart, Sparkles, ImagePlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vietnamProvinces } from '@/data/vietnamProvinces';
import { v4 as uuidv4 } from 'uuid';
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
    }
  }, [userId]);

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSetPrimary = useCallback(async (photoId: string) => {
    if (!userId) return;
    try {
      await supabase.from('photos').update({ is_primary: false }).eq('user_id', userId);
      await supabase.from('photos').update({ is_primary: true }).eq('id', photoId);
      await fetchPhotos();
      toast({ title: 'Thành công', description: 'Đã đặt làm ảnh chính' });
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể đặt ảnh chính', variant: 'destructive' });
    }
  }, [userId, fetchPhotos, toast]);

  return { photos, uploading, fetchPhotos, handlePhotoUpload, handleDeletePhoto, handleSetPrimary };
};

const PhotoGrid = ({ photos, uploading, onUpload, onDelete, onSetPrimary }: {
  photos: Photo[];
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (id: string, url: string) => void;
  onSetPrimary: (id: string) => void;
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
    <AnimatePresence mode="popLayout">
      {photos.map((photo, index) => (
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ delay: index * 0.05 }}
          className="relative group aspect-square rounded-xl overflow-hidden bg-muted"
        >
          <img src={photo.url} alt="User Photo" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {photo.is_primary && (
            <Badge className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 mr-1" /> Chính
            </Badge>
          )}
          <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!photo.is_primary && (
              <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs" onClick={() => onSetPrimary(photo.id)}>
                Đặt chính
              </Button>
            )}
            <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => onDelete(photo.id, photo.url)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
    
    {photos.length < 6 && (
      <motion.label
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-2 border-dashed border-muted-foreground/25 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
      >
        <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={uploading} />
        {uploading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-2" />
            <span className="text-xs text-muted-foreground">Đang tải...</span>
          </div>
        ) : (
          <div className="text-center">
            <ImagePlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <span className="text-xs text-muted-foreground">Thêm ảnh</span>
          </div>
        )}
      </motion.label>
    )}
  </div>
);

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
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
                <CardDescription>Thông tin hiển thị trên hồ sơ của bạn</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Tên đầy đủ</Label>
              <Input id="fullName" value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Nhập tên của bạn" maxLength={50} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Giới tính</Label>
              <RadioGroup value={profile.gender || ''} onValueChange={(value) => setProfile({ ...profile, gender: value })} className="flex flex-wrap gap-4">
                {[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'other', label: 'Khác' }].map((g) => (
                  <label key={g.value} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${profile.gender === g.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value={g.value} id={g.value} />
                    <span className="text-sm font-medium">{g.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ngày sinh</Label>
                <DatePicker date={profile.birth_date ? new Date(profile.birth_date) : undefined} onDateChange={handleBirthDateChange} placeholder="Chọn ngày sinh" disabled={(date) => date > new Date() || date < new Date('1900-01-01')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Tuổi</Label>
                <Input id="age" type="number" value={profile.age || ''} placeholder="Tự động tính" disabled className="h-11 bg-muted/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Địa điểm</Label>
              <Select value={profile.location || ''} onValueChange={(value) => setProfile({ ...profile, location: value })}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Chọn tỉnh/thành phố" /></SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="bio">Giới thiệu bản thân</Label>
              <Textarea id="bio" value={profile.bio || ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Hãy kể về bản thân bạn..." rows={4} maxLength={500} className="resize-none" />
              <p className="text-xs text-muted-foreground text-right">{(profile.bio?.length || 0)}/500</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Tìm kiếm kết nối</CardTitle>
                <CardDescription>Cho chúng tôi biết bạn đang tìm kiếm gì</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="lookingFor">Loại kết nối mong muốn</Label>
              <Select value={profile.looking_for || ''} onValueChange={(value) => setProfile({ ...profile, looking_for: value })}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Chọn loại kết nối" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendship">Bạn bè</SelectItem>
                  <SelectItem value="relationship">Hẹn hò</SelectItem>
                  <SelectItem value="casual">Gặp gỡ thoải mái</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Đối tượng muốn kết nối</Label>
              <RadioGroup value={profile.looking_for_gender || ''} onValueChange={(value) => setProfile({ ...profile, looking_for_gender: value })} className="flex flex-wrap gap-4">
                {[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'both', label: 'Cả hai' }].map((g) => (
                  <label key={g.value} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${profile.looking_for_gender === g.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value={g.value} id={`looking-${g.value}`} />
                    <span className="text-sm font-medium">{g.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Sở thích</CardTitle>
                <CardDescription>Thêm tối đa 10 sở thích để người khác hiểu bạn hơn</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={newInterest} onChange={(e) => setNewInterest(e.target.value)} placeholder="Nhập sở thích..." onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())} maxLength={30} className="h-11" />
              <Button onClick={addInterest} variant="secondary" className="h-11 px-4"><Plus className="h-4 w-4" /></Button>
            </div>
            <AnimatePresence mode="popLayout">
              <div className="flex flex-wrap gap-2">
                {profile.interests?.map((interest) => (
                  <motion.div
                    key={interest}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge variant="secondary" className="px-3 py-1.5 text-sm cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors" onClick={() => removeInterest(interest)}>
                      {interest}
                      <X className="h-3 w-3 ml-2" />
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Button onClick={handleSaveProfile} disabled={saving} size="lg" className="w-full h-12 text-base font-semibold shadow-lg">
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Đang lưu...
            </div>
          ) : (
            <><Save className="h-5 w-5 mr-2" />Lưu thông tin</>
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { photos, uploading, fetchPhotos, handlePhotoUpload, handleDeletePhoto, handleSetPrimary } = useProfilePhotos(user?.id);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/user/${user?.id}`)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chỉnh sửa hồ sơ</h1>
            <p className="text-sm text-muted-foreground">Cập nhật thông tin cá nhân của bạn</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Ảnh của bạn</CardTitle>
                  <CardDescription>Tối đa 6 ảnh. Ảnh đầu tiên sẽ là ảnh chính</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PhotoGrid
                photos={photos}
                uploading={uploading}
                onUpload={handlePhotoUpload}
                onDelete={handleDeletePhoto}
                onSetPrimary={handleSetPrimary}
              />
            </CardContent>
          </Card>
        </motion.div>

        {profile && <ProfileForm profile={profile} setProfile={setProfile} handleSaveProfile={handleSaveProfile} saving={saving} />}
      </div>
    </div>
  );
}
