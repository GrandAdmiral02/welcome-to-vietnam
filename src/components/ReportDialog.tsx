import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Shield, Flag } from 'lucide-react';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
}

const reportReasons = [
  { value: 'inappropriate_photos', label: 'Ảnh không phù hợp' },
  { value: 'fake_profile', label: 'Hồ sơ giả mạo' },
  { value: 'harassment', label: 'Quấy rối' },
  { value: 'spam', label: 'Spam/Quảng cáo' },
  { value: 'inappropriate_messages', label: 'Tin nhắn không phù hợp' },
  { value: 'underage', label: 'Chưa đủ tuổi' },
  { value: 'other', label: 'Lý do khác' }
];

export const ReportDialog = ({ 
  isOpen, 
  onClose, 
  reportedUserId, 
  reportedUserName 
}: ReportDialogProps) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Vui lòng chọn lý do",
        description: "Bạn cần chọn một lý do để báo cáo",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: (await supabase.auth.getUser()).data.user?.id,
          reported_id: reportedUserId,
          reason: reason,
          description: description.trim() || null
        });

      if (error) {
        console.error('Error submitting report:', error);
        toast({
          title: "Lỗi",
          description: "Không thể gửi báo cáo. Vui lòng thử lại",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Đã gửi báo cáo",
        description: "Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét và xử lý sớm nhất có thể.",
      });

      // Reset form and close
      setReason('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi gửi báo cáo",
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
            <Flag className="h-5 w-5" />
            Báo cáo người dùng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Báo cáo: {reportedUserName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vui lòng chỉ báo cáo những hành vi vi phạm nghiêm trọng. 
                  Báo cáo sai có thể ảnh hưởng đến tài khoản của bạn.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Lý do báo cáo</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reportReasons.map((reportReason) => (
                <div key={reportReason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reportReason.value} id={reportReason.value} />
                  <Label htmlFor={reportReason.value} className="cursor-pointer">
                    {reportReason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Chi tiết bổ sung (tùy chọn)</Label>
            <Textarea
              id="description"
              placeholder="Mô tả chi tiết về vấn đề..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Hủy
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1 bg-destructive hover:bg-destructive/90" 
              disabled={loading}
            >
              <Shield className="h-4 w-4 mr-2" />
              {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};