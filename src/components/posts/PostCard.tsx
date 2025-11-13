import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageSquare, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';

// A smaller component to render each comment and fetch its own profile
const Comment = ({ comment }: { comment: any }) => {
    const [profile, setProfile] = useState<any>(null);
    
    useEffect(() => {
        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('user_id', comment.user_id)
                .single();
            if (data) {
                setProfile(data);
            }
        };
        fetchProfile();
    }, [comment.user_id]);

    if (!profile) {
        return (
             <div className="flex items-center gap-3 animate-pulse">
                <Avatar className="h-8 w-8 bg-secondary rounded-full"></Avatar>
                <div className="bg-secondary p-3 rounded-lg w-full">
                   <div className="bg-muted h-4 w-1/2 rounded"></div>
                   <div className="bg-muted h-4 w-full mt-2 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url} asChild>
                    <Link to={`/user/${comment.user_id}`}><img src={profile.avatar_url} alt={profile.full_name} /></Link>
                </AvatarImage>
                <AvatarFallback>{profile.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-secondary p-3 rounded-lg w-full">
                <Link to={`/user/${comment.user_id}`} className="font-semibold text-sm hover:underline">{profile.full_name}</Link>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
        </div>
    );
};


const PostCard = ({ post, onUpdate }: { post: any, onUpdate: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the profile of the post author
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', post.user_id)
        .single();
      
      if (data) {
        setProfile(data);
      } else {
        console.error("Error fetching post author profile:", error);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [post.user_id]);

  // Check if the current user has liked the post
  useEffect(() => {
    if (!user) return;
    const checkLike = async () => {
      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();
      if (data) {
        setIsLiked(true);
      }
    };
    checkLike();
  }, [post.id, user]);

  const handleLike = async () => {
    if (!user) return toast({ title: 'Lỗi', description: 'Bạn cần đăng nhập để thích bài viết.', variant: 'destructive' });

    const originalLikedState = isLiked;
    setIsLiked(!originalLikedState);
    setLikeCount(prev => originalLikedState ? prev - 1 : prev + 1);

    try {
      if (originalLikedState) {
        const { error } = await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Like error:', error);
      setIsLiked(originalLikedState);
      setLikeCount(prev => originalLikedState ? prev + 1 : prev - 1);
      toast({ title: 'Lỗi', description: 'Không thể thích bài viết.', variant: 'destructive' });
    }
  };

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Fetch comments error:', error);
      toast({ title: 'Lỗi', description: 'Không thể tải bình luận.', variant: 'destructive'});
    }
  }, [post.id, toast]);


  const handleToggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };
  
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const { data: newCommentData, error } = await supabase
        .from('post_comments')
        .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() })
        .select()
        .single();

      if (error) throw error;
      
      setComments([...comments, newCommentData]);
      setCommentCount(prev => prev + 1);
      setNewComment('');
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể gửi bình luận.', variant: 'destructive' });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
      return (
          <Card className="animate-pulse">
              <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-muted rounded-full h-12 w-12"></div>
                  <div>
                      <div className="bg-muted h-5 w-40 rounded"></div>
                      <div className="bg-muted h-4 w-24 mt-1 rounded"></div>
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="bg-muted h-4 w-full rounded mb-2"></div>
                  <div className="bg-muted h-4 w-3/4 rounded"></div>
              </CardContent>
          </Card>
      )
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile?.avatar_url} asChild>
             <Link to={`/user/${post.user_id}`}><img src={profile?.avatar_url} alt={profile?.full_name} /></Link>
          </AvatarImage>
          <AvatarFallback>{profile?.full_name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        <div>
          <Link to={`/user/${post.user_id}`} className="font-bold hover:underline">
            {profile?.full_name}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {post.content && <p className="whitespace-pre-wrap mb-4">{post.content}</p>}
        {post.image_url && <img src={post.image_url} alt="Nội dung bài viết" className="mt-2 rounded-lg w-full max-h-[500px] object-contain border bg-secondary" />}
      </CardContent>
      <CardFooter className="flex flex-col items-start">
        <div className="flex justify-between w-full py-2">
           <span className="text-sm text-muted-foreground">{likeCount} lượt thích</span>
           <span className="text-sm text-muted-foreground cursor-pointer hover:underline" onClick={handleToggleComments}>{commentCount} bình luận</span>
        </div>
        <div className="border-t w-full flex justify-around">
            <Button variant="ghost" className="w-full" onClick={handleLike}>
                <Heart className={`mr-2 h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} /> Thích
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleToggleComments}>
                <MessageSquare className="mr-2 h-5 w-5" /> Bình luận
            </Button>
        </div>
        {showComments && (
          <div className="w-full pt-4">
            {user && (
              <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mb-4">
                  <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback>{user.user_metadata?.full_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <Textarea 
                    placeholder="Viết bình luận..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={1}
                    className="resize-none"
                  />
                  <Button type="submit" size="icon" disabled={isSubmittingComment || !newComment.trim()}>
                      {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                  </Button>
              </form>
            )}
            <div className="space-y-4">
                {comments.map(comment => (
                    <Comment key={comment.id} comment={comment} />
                ))}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default PostCard;
