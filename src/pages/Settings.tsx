import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Settings as SettingsIcon, 
  UserX, 
  Shield, 
  Eye, 
  EyeOff,
  Trash2,
  AlertTriangle 
} from 'lucide-react';

interface BlockedUser {
  id: string;
  blocked_id: string;
  reason?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface UserPreferences {
  show_age: boolean;
  show_distance: boolean;
  show_last_active: boolean;
  only_show_verified: boolean;
  hide_profile_from_feed: boolean;
}

const Settings = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    show_age: true,
    show_distance: true,
    show_last_active: false,
    only_show_verified: false,
    hide_profile_from_feed: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchBlockedUsers();
      fetchPreferences();
    }
  }, [user]);

  const fetchBlockedUsers = async () => {
    try {
      // First get blocked user IDs
      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_users')
        .select('id, blocked_id, reason, created_at')
        .eq('blocker_id', user?.id)
        .order('created_at', { ascending: false });

      if (blockedError) {
        console.error('Error fetching blocked users:', blockedError);
        return;
      }

      // Then get profile info for each blocked user
      const usersWithProfiles = await Promise.all(
        (blockedData || []).map(async (blockedUser) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', blockedUser.blocked_id)
            .single();

          return {
            ...blockedUser,
            profiles: profile
          };
        })
      );

      setBlockedUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          show_age: data.show_age,
          show_distance: data.show_distance,
          show_last_active: data.show_last_active,
          only_show_verified: data.only_show_verified,
          hide_profile_from_feed: data.hide_profile_from_feed
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          ...preferences
        });

      if (error) {
        console.error('Error saving preferences:', error);
        toast({
          title: "Lỗi",
          description: "Không thể lưu tùy chọn",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Đã lưu",
        description: "Tùy chọn của bạn đã được cập nhật"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi lưu tùy chọn",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (blockedUserId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user?.id)
        .eq('blocked_id', blockedUserId);

      if (error) {
        console.error('Error unblocking user:', error);
        toast({
          title: "Lỗi",
          description: "Không thể bỏ chặn người dùng",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Đã bỏ chặn",
        description: `Bạn đã bỏ chặn ${userName}`
      });

      // Refresh blocked users list
      fetchBlockedUsers();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra",
        variant: "destructive"
      });
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Cài đặt
            </Button>
            <Button
              onClick={savePreferences}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">Cài đặt</h1>
          <p className="text-muted-foreground">
            Quản lý tùy chọn riêng tư và bảo mật của bạn
          </p>
        </div>

        {/* Privacy Settings */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Tùy chọn hiển thị
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Hiển thị tuổi trên hồ sơ</Label>
                <p className="text-sm text-muted-foreground">
                  Cho phép người khác thấy tuổi của bạn
                </p>
              </div>
              <Switch
                checked={preferences.show_age}
                onCheckedChange={(checked) => updatePreference('show_age', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Hiển thị khoảng cách</Label>
                <p className="text-sm text-muted-foreground">
                  Cho phép người khác thấy khoảng cách từ vị trí của họ
                </p>
              </div>
              <Switch
                checked={preferences.show_distance}
                onCheckedChange={(checked) => updatePreference('show_distance', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Hiển thị lần hoạt động cuối</Label>
                <p className="text-sm text-muted-foreground">
                  Cho phép người khác thấy khi bạn online lần cuối
                </p>
              </div>
              <Switch
                checked={preferences.show_last_active}
                onCheckedChange={(checked) => updatePreference('show_last_active', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ẩn hồ sơ khỏi trang khám phá</Label>
                <p className="text-sm text-muted-foreground">
                  Hồ sơ của bạn sẽ không xuất hiện cho người khác
                </p>
              </div>
              <Switch
                checked={preferences.hide_profile_from_feed}
                onCheckedChange={(checked) => updatePreference('hide_profile_from_feed', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Discovery Settings */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Tùy chọn khám phá
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Chỉ hiển thị người dùng đã xác minh</Label>
                <p className="text-sm text-muted-foreground">
                  Lọc để chỉ thấy những người đã xác minh danh tính
                </p>
              </div>
              <Switch
                checked={preferences.only_show_verified}
                onCheckedChange={(checked) => updatePreference('only_show_verified', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Blocked Users */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Người dùng đã chặn
              {blockedUsers.length > 0 && (
                <Badge variant="secondary">{blockedUsers.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blockedUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Bạn chưa chặn ai cả
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {blockedUsers.map((blockedUser) => (
                  <div key={blockedUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <UserX className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {blockedUser.profiles?.full_name || 'Người dùng đã xóa'}
                        </p>
                        {blockedUser.reason && (
                          <p className="text-sm text-muted-foreground">
                            Lý do: {blockedUser.reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Chặn vào {new Date(blockedUser.created_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(
                        blockedUser.blocked_id, 
                        blockedUser.profiles?.full_name || 'người dùng này'
                      )}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Bỏ chặn
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Vùng nguy hiểm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-2">Xóa tài khoản</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Xóa vĩnh viễn tài khoản và tất cả dữ liệu của bạn. Hành động này không thể hoàn tác.
                </p>
                <Button variant="destructive" disabled>
                  Xóa tài khoản
                  <span className="ml-2 text-xs">(Sắp có)</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;