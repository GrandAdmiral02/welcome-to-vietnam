import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Lỗi đăng nhập",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Đăng nhập thành công!",
        description: "Chào mừng bạn quay lại Hippo Lovely!"
      });
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      toast({
        title: "Lỗi đăng ký",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // Gửi email xác nhận
      try {
        await supabase.functions.invoke('send-confirmation-email', {
          body: {
            email: email,
            name: fullName
          }
        });
        
        toast({
          title: "Đăng ký thành công!",
          description: "Vui lòng kiểm tra email để xác thực tài khoản. Email xác nhận đã được gửi!"
        });
      } catch (emailError) {
        console.error('Lỗi gửi email:', emailError);
        toast({
          title: "Đăng ký thành công!",
          description: "Tài khoản đã được tạo nhưng không thể gửi email xác nhận. Vui lòng liên hệ hỗ trợ.",
          variant: "destructive"
        });
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-primary rounded-full p-3">
              <Heart className="h-8 w-8 text-primary-foreground" />
            </div>
            <Sparkles className="h-6 w-6 text-accent animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Hippo Lovely</h1>
          <p className="text-muted-foreground mt-2">Kết nối những tâm hồn đồng điệu</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chào mừng!</CardTitle>
            <CardDescription>
              Đăng nhập hoặc tạo tài khoản để bắt đầu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
                <TabsTrigger value="signup">Đăng ký</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mật khẩu</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Họ và tên</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mật khẩu</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;