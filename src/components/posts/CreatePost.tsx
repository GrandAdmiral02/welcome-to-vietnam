import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ImagePlus, X, Loader2 } from 'lucide-react';

interface CreatePostProps {
  onPostCreated: () => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast({ title: 'Lỗi', description: 'Kích thước ảnh không được vượt quá 5MB.', variant: 'destructive' });
          return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('post_images')
      .upload(filePath, imageFile);

    if (uploadError) {
      throw new Error('Không thể tải ảnh lên. Lỗi: ' + uploadError.message);
    }

    const { data } = supabase.storage
      .from('post_images')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !imageFile) || !user) {
      toast({ title: 'Nội dung trống', description: 'Bạn cần viết gì đó hoặc chọn một ảnh để đăng bài.', variant: 'destructive'});
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const { error } = await supabase
        .from('posts')
        .insert([{ 
          user_id: user.id, 
          content: content.trim() || null, // Allow empty content if there is an image 
          image_url: imageUrl 
        }]);

      if (error) throw error;

      setContent('');
      handleRemoveImage();
      toast({ title: 'Thành công', description: 'Bài viết của bạn đã được đăng.' });
      onPostCreated(); // Callback to refresh the feed
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo bài viết. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Bạn đang nghĩ gì?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={2000}
          />

          {imagePreview && (
            <div className="relative mt-2">
              <img src={imagePreview} alt="Xem trước ảnh" className="rounded-lg max-h-80 w-auto" />
              <Button 
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center">
             <Button 
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
             >
                <ImagePlus className="h-5 w-5 text-primary" />
             </Button>
             <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/gif"
             />
            <Button type="submit" disabled={isSubmitting || (!content.trim() && !imageFile)}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              {isSubmitting ? 'Đang đăng...' : 'Đăng bài'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
