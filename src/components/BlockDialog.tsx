import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserX, AlertTriangle } from 'lucide-react';

interface BlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blockedUserId: string;
  blockedUserName: string;
  onBlockComplete?: () => void;
}

export const BlockDialog = ({ 
  isOpen, 
  onClose, 
  blockedUserId, 
  blockedUserName,
  onBlockComplete 
}: BlockDialogProps) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBlock = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: (await supabase.auth.getUser()).data.user?.id,
          blocked_id: blockedUserId,
          reason: reason.trim() || null
        });

      if (error) {
        console.error('Error blocking user:', error);
        toast({
          title: "Lỗi",
          description: "Không thể chặn người dùng. Vui lòng thử lại",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Đã chặn người dùng",
        description: `Bạn đã chặn ${blockedUserName}. Họ sẽ không còn xuất hiện trong danh sách khám phá.`,
      });

      // Reset form and close
      setReason('');
      onClose();
      onBlockComplete?.();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi chặn người dùng",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <UserX className="h-5 w-5" />
            Chặn người dùng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Chặn: {blockedUserName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sau khi chặn, bạn và {blockedUserName} sẽ không thể thấy hồ sơ của nhau. 
                  Bạn có thể bỏ chặn bất cứ lúc nào trong cài đặt.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Lý do chặn (tùy chọn)</Label>
            <Textarea
              id="reason"
              placeholder="Tại sao bạn muốn chặn người dùng này?..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Thông tin này sẽ được bảo mật và chỉ dùng để cải thiện dịch vụ
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Hủy
            </Button>
            <Button 
              onClick={handleBlock} 
              className="flex-1 bg-destructive hover:bg-destructive/90" 
              disabled={loading}
            >
              <UserX className="h-4 w-4 mr-2" />
              {loading ? 'Đang chặn...' : 'Chặn người dùng'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};