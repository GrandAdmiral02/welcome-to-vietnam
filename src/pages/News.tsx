import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Newspaper, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Article {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string | null;
}

const News = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setArticles(data);
      }
      setLoading(false);
    };

    fetchArticles();
  }, []);

  const getExcerpt = (content: string, maxLength: number = 120) => {
    // Strip HTML tags and get plain text
    const plainText = content.replace(/<[^>]*>/g, '');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength).trim() + '...';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Skeleton className="h-[400px] rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-[190px] rounded-xl" />
            <Skeleton className="h-[190px] rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[280px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const featuredArticle = articles[0];
  const secondaryArticles = articles.slice(1, 3);
  const remainingArticles = articles.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Newspaper className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Tin tức & Cập nhật</h1>
        </div>
        <p className="text-muted-foreground ml-12">
          Những thông tin mới nhất từ Hippo Lovely dành cho bạn
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="container mx-auto px-4">
          <div className="text-center py-20 bg-muted/30 rounded-2xl">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Chưa có bài viết nào</h2>
            <p className="text-muted-foreground">Hãy quay lại sau để xem các cập nhật mới nhất!</p>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 pb-12">
          {/* Featured Section */}
          {featuredArticle && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              {/* Main Featured */}
              <Link to={`/news/${featuredArticle.id}`} className="group">
                <Card className="overflow-hidden h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="relative h-[300px] lg:h-full min-h-[300px]">
                    <img
                      src={featuredArticle.image_url || '/placeholder.svg'}
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <Badge className="mb-3 bg-primary/90 hover:bg-primary">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Nổi bật
                      </Badge>
                      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 group-hover:text-primary-foreground transition-colors line-clamp-2">
                        {featuredArticle.title}
                      </h2>
                      <p className="text-white/80 line-clamp-2 mb-3">
                        {getExcerpt(featuredArticle.content, 150)}
                      </p>
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Clock className="w-4 h-4" />
                        {format(new Date(featuredArticle.created_at), "dd 'tháng' MM, yyyy", { locale: vi })}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Secondary Featured */}
              <div className="flex flex-col gap-6">
                {secondaryArticles.map((article) => (
                  <Link key={article.id} to={`/news/${article.id}`} className="group flex-1">
                    <Card className="overflow-hidden h-full border-0 shadow-md hover:shadow-lg transition-all duration-300">
                      <div className="flex h-full">
                        <div className="w-2/5 relative">
                          <img
                            src={article.image_url || '/placeholder.svg'}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <CardContent className="w-3/5 p-4 flex flex-col justify-center">
                          <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                            {getExcerpt(article.content, 80)}
                          </p>
                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Clock className="w-3 h-3" />
                            {format(new Date(article.created_at), "dd/MM/yyyy", { locale: vi })}
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                ))}
                
                {/* Fill empty space if less than 2 secondary articles */}
                {secondaryArticles.length < 2 && (
                  <div className="flex-1 bg-muted/30 rounded-xl flex items-center justify-center">
                    <p className="text-muted-foreground">Thêm bài viết sắp có...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Remaining Articles Grid */}
          {remainingArticles.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-muted-foreground text-sm font-medium px-4">Bài viết khác</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingArticles.map((article) => (
                  <Link key={article.id} to={`/news/${article.id}`} className="group">
                    <Card className="overflow-hidden h-full border-0 shadow-md hover:shadow-lg transition-all duration-300">
                      <div className="relative aspect-video">
                        <img
                          src={article.image_url || '/placeholder.svg'}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                          {getExcerpt(article.content, 80)}
                        </p>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Clock className="w-3 h-3" />
                          {format(new Date(article.created_at), "dd/MM/yyyy", { locale: vi })}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default News;
