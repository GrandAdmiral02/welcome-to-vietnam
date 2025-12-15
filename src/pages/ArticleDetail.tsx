import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ServerCrash } from 'lucide-react';

// Article structure remains simple as we only fetch the content
interface Article {
  id: string;
  content: string;
}

const ArticleDetailPage = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch only the content of the specific article
        const { data, error: fetchError } = await supabase
          .from('articles')
          .select('id, content')
          .eq('id', articleId)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new Error('Bài viết không tồn tại hoặc đã bị xóa.');
          } else {
            throw fetchError;
          }
        }

        setArticle(data);

      } catch (e: any) {
        console.error('Error fetching article content:', e);
        setError(e.message || 'Không thể tải nội dung bài viết. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Đã xảy ra lỗi</h2>
        <p className="text-muted-foreground">{error || 'Không tìm thấy bài viết.'}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background">
      <iframe
        srcDoc={article.content} // Directly use the fetched HTML content
        title={`Article - ${article.id}`}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin" // Security sandbox for the iframe
      />
    </div>
  );
};

export default ArticleDetailPage;
