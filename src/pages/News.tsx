
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ServerCrash, Newspaper } from 'lucide-react';

// Define the structure of an Article for the listing page
interface Article {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
}

const NewsPage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch articles from the public.articles table
        const { data, error: fetchError } = await supabase
          .from('articles')
          .select('id, title, image_url, created_at')
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setArticles(data || []);
      } catch (e: any) {
        console.error('Error fetching articles:', e);
        setError('Không thể tải danh sách bài viết. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Đã xảy ra lỗi</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Tin tức & Thông báo</h1>
      <p className="text-muted-foreground mb-8">
        Cập nhật những thông tin mới nhất từ Hippo Lovely.
      </p>

      {articles.length === 0 ? (
        <div className="text-center text-muted-foreground h-[40vh] flex flex-col justify-center items-center">
          <Newspaper className="w-16 h-16 mb-4" />
          <p className="text-lg">Chưa có bài viết nào được đăng.</p>
          <p>Hãy quay lại sau để xem các cập nhật mới nhất nhé!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link to={`/news/${article.id}`} key={article.id}>
              <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                <div className="relative aspect-video">
                  <img
                    src={article.image_url || '/placeholder.svg'} // Use a placeholder if no image
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <CardContent className="p-4 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors duration-300">{article.title}</h3>
                    <p className="text-sm text-muted-foreground mt-auto pt-2">{new Date(article.created_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// Remember to change the export name if you renamed the component
const News = NewsPage;
export default News;
