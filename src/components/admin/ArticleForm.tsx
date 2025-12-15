
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Define the shape of an article based on our DB schema
interface Article {
  id?: string;
  title: string;
  content: string;
  image_url?: string;
  user_id?: string;
}

interface ArticleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // To refresh the list after saving
  articleToEdit: Partial<Article> | null;
}

const ArticleForm = ({ isOpen, onClose, onSave, articleToEdit }: ArticleFormProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Pre-fill the form if we are editing an existing article
    if (articleToEdit) {
      setTitle(articleToEdit.title || '');
      setContent(articleToEdit.content || '');
      setImageUrl(articleToEdit.image_url || '');
    } else {
      // Reset form when opening for a new article
      setTitle('');
      setContent('');
      setImageUrl('');
    }
  }, [articleToEdit, isOpen]);

  const handleSubmit = async () => {
    if (!title || !content) {
      toast.error('Tiêu đề và nội dung không được để trống.');
      return;
    }
    if (!user) {
      toast.error('Bạn phải đăng nhập để thực hiện hành động này.');
      return;
    }

    setIsSaving(true);
    const articleData = {
      title,
      content,
      image_url: imageUrl || null,
      user_id: user.id,
    };

    try {
      let error;
      if (articleToEdit?.id) {
        // Update existing article
        const { error: updateError } = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', articleToEdit.id);
        error = updateError;
      } else {
        // Create new article
        const { error: insertError } = await supabase
          .from('articles')
          .insert(articleData);
        error = insertError;
      }

      if (error) throw error;

      toast.success(articleToEdit?.id ? 'Cập nhật bài viết thành công!' : 'Tạo bài viết thành công!');
      onSave(); // Trigger a refresh on the parent component
      onClose(); // Close the dialog
    } catch (error: any) {
      console.error('Error saving article:', error);
      toast.error(`Lỗi lưu bài viết: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{articleToEdit?.id ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</DialogTitle>
          <DialogDescription>
            Điền thông tin và dán toàn bộ mã nguồn HTML của bài viết vào ô nội dung.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Tiêu đề
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="Tiêu đề chính của bài viết"
              disabled={isSaving}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image_url" className="text-right">
              URL Ảnh bìa
            </Label>
            <Input
              id="image_url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://example.com/image.png (dùng cho trang danh sách)"
              disabled={isSaving}
            />
          </div>
          <div className="grid w-full gap-2">
             <Label htmlFor="content">
              Nội dung (HTML đầy đủ)
            </Label>
            {/* The HTML code editor */}
            <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono bg-muted/50"
                placeholder="<!DOCTYPE html>..."
                rows={20}
                disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Đang lưu...' : 'Lưu bài viết'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ArticleForm;
