import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { Heart, Sparkles, MailCheck } from 'lucide-react';

const Auth = () => {
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUpSuccess, setIsSignUpSuccess] = useState(false);

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
      setIsSignUpSuccess(true);
    }
    
    setLoading(false);
  };
  
  if (isSignUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <MailCheck className="mx-auto h-16 w-16 text-green-500" />
            <CardTitle className="mt-4 text-2xl font-bold">Đăng ký thành công!</CardTitle>
            <CardDescription className="mt-2 text-muted-foreground">
              Một email xác thực đã được gửi đến địa chỉ email của bạn. Vui lòng kiểm tra hộp thư đến (và cả thư mục spam) để kích hoạt tài khoản.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Button 
                onClick={() => setIsSignUpSuccess(false)}
                variant="outline"
                className="w-full"
              >
                Quay lại trang đăng nhập
              </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-full blur-lg opacity-50 animate-pulse-glow" />
              <div className="relative bg-gradient-primary rounded-full p-4 shadow-glow">
                <Heart className="h-10 w-10 text-primary-foreground" fill="currentColor" />
              </div>
            </div>
            <Sparkles className="h-8 w-8 text-accent animate-pulse float" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
            Hippo Lovely
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Kết nối những tâm hồn đồng điệu
          </p>
        </div>

        <Card className="glass border-border/50 shadow-elegant backdrop-blur-xl">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Chào mừng!</CardTitle>
            <CardDescription className="text-center text-base">
              Đăng nhập hoặc tạo tài khoản để bắt đầu hành trình của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  Đăng nhập
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  Đăng ký
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-5 mt-6">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-semibold">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-semibold">Mật khẩu</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold shadow-card hover:shadow-elegant transition-all hover:-translate-y-0.5" 
                    disabled={loading}
                  >
                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-5 mt-6">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-semibold">Họ và tên</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-semibold">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-semibold">Mật khẩu</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                      minLength={6}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold shadow-card hover:shadow-elegant transition-all hover:-translate-y-0.5" 
                    disabled={loading}
                  >
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
