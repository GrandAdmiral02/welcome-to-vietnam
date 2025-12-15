
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Loader2, ServerCrash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ArticleForm from './ArticleForm'; // Import the form component

// Define the complete Article type to match the data being passed
interface Article {
  id: string;
  created_at: string;
  title: string;
  user_id: string;
  content: string;
  image_url: string | null;
}

const ArticleManagement = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null); // Use the full Article type

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      // Select all fields to ensure the form can be pre-filled for editing
      const { data, error } = await supabase
        .from('articles')
        .select('*') 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (e: any) {
      console.error('Error fetching articles:', e);
      setError('Không thể tải danh sách bài viết.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleCreateNew = () => {
    setEditingArticle(null);
    setIsFormOpen(true);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setIsFormOpen(true);
  };

  const handleDelete = async (articleId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      const { error } = await supabase.from('articles').delete().eq('id', articleId);
      if (error) throw error;
      toast.success('Xóa bài viết thành công!');
      fetchArticles(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting article:', error);
      toast.error(`Lỗi xóa bài viết: ${error.message}`);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="flex items-center justify-center py-10"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (error) {
      return <div className="text-center py-10 text-red-500"><ServerCrash className="mx-auto w-8 h-8 mb-2" /><p>{error}</p></div>;
    }

    if (articles.length === 0) {
      return (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Chưa có bài viết nào.</p>
          <p className="text-sm text-muted-foreground">
            Bấm "Tạo bài viết mới" để bắt đầu.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tiêu đề</TableHead>
            <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map((article) => (
            <TableRow key={article.id}>
              <TableCell className="font-medium">{article.title}</TableCell>
              <TableCell className="hidden md:table-cell">{new Date(article.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Mở menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(article)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Sửa</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(article.id)} className="text-red-500 focus:text-red-500">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Xóa</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Quản lý Bài viết</CardTitle>
              <CardDescription>
                Tạo, sửa hoặc xóa các bài viết và tin tức cho người dùng.
              </CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tạo bài viết mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      <ArticleForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={() => {
          fetchArticles(); // Refresh the list when a save occurs
        }}
        articleToEdit={editingArticle}
      />
    </>
  );
};

export default ArticleManagement;
