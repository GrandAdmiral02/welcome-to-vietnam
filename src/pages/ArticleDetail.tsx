import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Clock, 
  Heart, 
  MessageCircle, 
  Share2, 
  Send,
  ServerCrash,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

interface Article {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const ArticleDetail = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!articleId) return;

    const fetchArticle = async () => {
      setLoading(true);
      try {
        // Fetch article
        const { data: articleData, error: articleError } = await supabase
          .from('articles')
          .select('*')
          .eq('id', articleId)
          .maybeSingle();

        if (articleError) throw articleError;
        if (!articleData) {
          setError('Bài viết không tồn tại hoặc đã bị xóa.');
          setLoading(false);
          return;
        }

        setArticle(articleData);

        // Fetch like count
        const { count: likesCount } = await supabase
          .from('article_likes')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', articleId);
        
        setLikeCount(likesCount || 0);

        // Check if user liked
        if (user) {
          const { data: userLike } = await supabase
            .from('article_likes')
            .select('id')
            .eq('article_id', articleId)
            .eq('user_id', user.id)
            .maybeSingle();
          
          setLiked(!!userLike);
        }

        // Fetch comments with profiles
        const { data: commentsData } = await supabase
          .from('article_comments')
          .select('*')
          .eq('article_id', articleId)
          .order('created_at', { ascending: true });

        if (commentsData && commentsData.length > 0) {
          // Fetch profiles for comments
          const userIds = [...new Set(commentsData.map(c => c.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
          
          const commentsWithProfiles = commentsData.map(comment => ({
            ...comment,
            profile: profileMap.get(comment.user_id)
          }));

          setComments(commentsWithProfiles);
        }
      } catch (e: any) {
        console.error('Error:', e);
        setError('Không thể tải bài viết.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId, user]);

  const handleLike = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    try {
      if (liked) {
        await supabase
          .from('article_likes')
          .delete()
          .eq('article_id', articleId)
          .eq('user_id', user.id);
        setLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await supabase
          .from('article_likes')
          .insert({ article_id: articleId, user_id: user.id });
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để bình luận');
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('article_comments')
        .insert({
          article_id: articleId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch profile for new comment
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      setComments(prev => [...prev, { ...data, profile }]);
      setNewComment('');
      toast.success('Đã gửi bình luận');
    } catch (error) {
      toast.error('Không thể gửi bình luận');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Đã sao chép liên kết');
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Đã xảy ra lỗi</h2>
        <p className="text-muted-foreground mb-4">{error || 'Không tìm thấy bài viết.'}</p>
        <Button asChild>
          <Link to="/news">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại tin tức
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container max-w-4xl mx-auto px-4 pt-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/news">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Link>
        </Button>
      </div>

      {/* Article Header */}
      <article className="container max-w-4xl mx-auto px-4 pb-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <time dateTime={article.created_at}>
                {format(new Date(article.created_at), "EEEE, dd 'tháng' MM yyyy", { locale: vi })}
              </time>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {article.image_url && (
          <div className="relative aspect-video rounded-xl overflow-hidden mb-8 shadow-lg">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <div 
          className="prose prose-lg dark:prose-invert max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Actions */}
        <div className="flex items-center gap-4 py-4 border-y border-border">
          <Button
            variant={liked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className="gap-2"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            {likeCount} Thích
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            {comments.length} Bình luận
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="w-4 h-4" />
            Chia sẻ
          </Button>
        </div>

        {/* Comments Section */}
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-6">Bình luận ({comments.length})</h2>

          {/* Comment Input */}
          {user ? (
            <div className="flex gap-3 mb-6">
              <Avatar className="w-10 h-10">
                <AvatarImage src="" />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Viết bình luận của bạn..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <Button 
                  onClick={handleComment} 
                  disabled={submitting || !newComment.trim()}
                  className="mt-2"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Gửi
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-center">
              <p className="text-muted-foreground mb-2">Đăng nhập để bình luận</p>
              <Button asChild size="sm">
                <Link to="/auth">Đăng nhập</Link>
              </Button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Chưa có bình luận nào. Hãy là người đầu tiên!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 bg-muted/30 rounded-lg">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={comment.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {comment.profile?.full_name?.charAt(0) || <User className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {comment.profile?.full_name || 'Người dùng'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </article>
    </div>
  );
};

export default ArticleDetail;
