
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Về Hippo Lovely</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <p className="text-lg leading-relaxed">
            Hippo Lovely là một ứng dụng hẹn hò được tạo ra với mục đích kết nối mọi người lại với nhau. Chúng tôi tin rằng trong thế giới kỹ thuật số ngày nay, việc tìm kiếm một người bạn tâm giao, một người bạn đồng hành, hoặc đơn giản là một cuộc trò chuyện thú vị không nên là một điều khó khăn.
          </p>
          <p>
            Sứ mệnh của chúng tôi là tạo ra một không gian an toàn, thân thiện và đáng tin cậy, nơi mọi người có thể tự do thể hiện bản thân và tìm kiếm những kết nối ý nghĩa. Chúng tôi sử dụng các thuật toán thông minh để giúp bạn tìm thấy những người phù hợp nhất dựa trên sở thích, tính cách và mục tiêu của bạn.
          </p>
          <p>
            Tại Hippo Lovely, chúng tôi không chỉ xây dựng một ứng dụng, chúng tôi đang xây dựng một cộng đồng. Một cộng đồng của những trái tim rộng mở, sẵn sàng cho những cuộc phiêu lưu mới và những mối quan hệ lâu dài.
          </p>
          <h2 className="text-2xl font-semibold text-foreground pt-4">Tại sao lại là "Hippo Lovely"?</h2>
          <p>
            Hà mã (Hippo) có vẻ ngoài đáng yêu và hiền lành, nhưng chúng cũng là những sinh vật mạnh mẽ và kiên định. Chúng tôi tin rằng tình yêu và các mối quan hệ cũng vậy - cần sự dịu dàng, chân thành nhưng cũng không kém phần mạnh mẽ để vượt qua thử thách. "Lovely" đơn giản là vì chúng tôi muốn mọi trải nghiệm của bạn trên ứng dụng này đều thật đáng yêu.
          </p>
          <p>
            Cảm ơn bạn đã tham gia cộng đồng Hippo Lovely. Chúc bạn có những trải nghiệm tuyệt vời và tìm thấy những gì bạn đang tìm kiếm!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
