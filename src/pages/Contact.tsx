
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send } from "lucide-react";

export default function Contact() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Mail className="h-8 w-8" /> Liên hệ với chúng tôi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Chúng tôi luôn sẵn lòng lắng nghe bạn. Nếu bạn có bất kỳ câu hỏi, góp ý, hoặc cần hỗ trợ, đừng ngần ngại điền vào biểu mẫu dưới đây. đội ngũ Hippo Lovely sẽ phản hồi bạn trong thời gian sớm nhất.
          </p>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên của bạn</Label>
                <Input id="name" placeholder="Nhập tên của bạn" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Nhập email của bạn" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Chủ đề</Label>
              <Input id="subject" placeholder="Vấn đề bạn đang gặp phải" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Nội dung</Label>
              <Textarea id="message" placeholder="Hãy cho chúng tôi biết chi tiết hơn..." rows={6} />
            </div>
            <div className="text-right">
              <Button type="submit" className="bg-gradient-to-r from-primary to-primary/70">
                <Send className="h-4 w-4 mr-2" /> Gửi tin nhắn
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
