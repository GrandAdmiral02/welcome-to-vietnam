import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send } from 'lucide-react';

const SystemNotifications = () => {
  const { toast } = useToast();
  const [target, setTarget] = useState('all'); // 'all' or 'specific'
  const [targetUserId, setTargetUserId] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendNotification = async () => {
    if (!content.trim()) {
      toast({ title: "Lỗi", description: "Nội dung thông báo không được để trống.", variant: "destructive" });
      return;
    }
    if (target === 'specific' && !targetUserId.trim()) {
        toast({ title: "Lỗi", description: "ID Người dùng không được để trống.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
        const notification = {
            content,
            target_user_id: target === 'specific' ? targetUserId : null,
            notification_type: 'info', // Can be extended later
        };

        const { error } = await supabase.from('system_notifications').insert(notification);

        if (error) throw error;

        toast({ title: "Thành công", description: "Thông báo đã được gửi đi." });
        // Reset form
        setContent('');
        setTargetUserId('');

    } catch (error: any) {
        console.error("Error sending notification:", error);
        toast({ title: "Lỗi gửi thông báo", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-card text-card-foreground rounded-lg shadow-md mt-4">
      <h2 className="text-xl font-semibold mb-4">Gửi Thông báo Hệ thống</h2>
      <div className="space-y-6">
        <div>
            <Label>Đối tượng</Label>
            <RadioGroup defaultValue="all" value={target} onValueChange={setTarget} className="mt-2 flex items-center gap-4">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="r1" />
                    <Label htmlFor="r1">Toàn bộ người dùng</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="r2" />
                    <Label htmlFor="r2">Người dùng cụ thể</Label>
                </div>
            </RadioGroup>
        </div>

        {target === 'specific' && (
          <div>
            <Label htmlFor="user-id">ID Người dùng</Label>
            <Input 
                id="user-id" 
                placeholder="Nhập User ID (UUID)" 
                value={targetUserId} 
                onChange={(e) => setTargetUserId(e.target.value)} 
                className="mt-1"
            />
          </div>
        )}

        <div>
          <Label htmlFor="notification-content">Nội dung</Label>
          <Textarea 
            id="notification-content" 
            placeholder="Viết thông báo của bạn ở đây..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="mt-1"
           />
        </div>

        <div className="flex justify-end">
            <Button onClick={handleSendNotification} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                Gửi thông báo
            </Button>
        </div>
      </div>
    </div>
  );
};

export default SystemNotifications;
