import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CreatePost from './CreatePost';
import PostCard from './PostCard';

interface PostFeedProps {
  userId: string;
  isOwnProfile: boolean;
}

const PostFeed = ({ userId, isOwnProfile }: PostFeedProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPosts = useCallback(async () => {
    // We don't set loading to true here to avoid flashing on re-fetch (e.g. after a comment)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          post_likes(count),
          post_comments(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPosts = data.map(post => ({
        ...post,
        likes: post.post_likes[0]?.count || 0,
        comments: post.post_comments[0]?.count || 0,
      }));
      setPosts(formattedPosts);

    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải các bài viết. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const onPostCreated = () => {
    // Re-fetch posts to show the new one
    fetchPosts();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Đang tải bài viết...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOwnProfile && <CreatePost onPostCreated={onPostCreated} />}
      
      {posts.length === 0 && !loading ? (
        <div className="text-center py-10 bg-secondary rounded-lg">
          <p className="text-muted-foreground">
            {isOwnProfile ? 'Bạn chưa có bài viết nào. Hãy chia sẻ điều gì đó!' : 'Người dùng này chưa có bài viết nào.'}
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post}
            onUpdate={fetchPosts} // Pass the fetch function to re-render on like/comment
          />
        ))
      )}
    </div>
  );
};

export default PostFeed;
