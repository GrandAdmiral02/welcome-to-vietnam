
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Chính sách bảo mật</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground prose prose-lg max-w-none">
          <p>Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
          
          <p>
            Chào mừng bạn đến với Hippo Lovely! Chúng tôi cam kết bảo vệ sự riêng tư của bạn. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng, tiết lộ và bảo vệ thông tin của bạn khi bạn sử dụng ứng dụng của chúng tôi.
          </p>

          <h2>1. Thông tin chúng tôi thu thập</h2>
          <p>
            Chúng tôi có thể thu thập các loại thông tin sau về bạn:
          </p>
          <ul>
            <li><strong>Thông tin cá nhân:</strong> Tên, địa chỉ email, ngày sinh, giới tính, vị trí, ảnh và bất kỳ thông tin nào khác bạn cung cấp trong hồ sơ của mình.</li>
            <li><strong>Thông tin sử dụng:</strong> Cách bạn tương tác với ứng dụng, các hồ sơ bạn xem, lượt thích, lượt bỏ qua, và các tin nhắn bạn gửi và nhận.</li>
            <li><strong>Thông tin thiết bị:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành, và các thông tin kỹ thuật khác.</li>
          </ul>

          <h2>2. Cách chúng tôi sử dụng thông tin của bạn</h2>
          <p>
            Thông tin của bạn được sử dụng để:
          </p>
          <ul>
            <li>Cung cấp, vận hành và duy trì ứng dụng của chúng tôi.</li>
            <li>Cải thiện, cá nhân hóa và mở rộng ứng dụng.</li>
            <li>Hiểu và phân tích cách bạn sử dụng ứng dụng.</li>
            <li>Phát triển sản phẩm, dịch vụ, tính năng và chức năng mới.</li>
            <li>Giao tiếp với bạn, để cung cấp cho bạn các bản cập nhật và thông tin khác liên quan đến ứng dụng, và cho các mục đích tiếp thị và quảng cáo.</li>
            <li>Phát hiện và ngăn chặn gian lận.</li>
          </ul>

          <h2>3. Chia sẻ thông tin của bạn</h2>
          <p>
            Chúng tôi không bán thông tin cá nhân của bạn. Chúng tôi có thể chia sẻ thông tin của bạn trong các trường hợp sau:
          </p>
          <ul>
            <li>Với các nhà cung cấp dịch vụ để thực hiện các dịch vụ thay mặt chúng tôi.</li>
            <li>Để tuân thủ các nghĩa vụ pháp lý.</li>
            <li>Để bảo vệ quyền và sự an toàn của chúng tôi và của người dùng khác.</li>
            <li>Trong trường hợp sáp nhập, mua lại hoặc bán tài sản.</li>
          </ul>

          <h2>4. Bảo mật thông tin</h2>
          <p>
            Chúng tôi sử dụng các biện pháp bảo mật hợp lý để bảo vệ thông tin của bạn. Tuy nhiên, không có phương thức truyền tải qua Internet hoặc phương thức lưu trữ điện tử nào là an toàn 100%.
          </p>

          <h2>5. Liên hệ với chúng tôi</h2>
          <p>
            Nếu bạn có bất kỳ câu hỏi nào về Chính sách bảo mật này, vui lòng liên hệ với chúng tôi qua trang <a href="/contact" className="text-primary hover:underline">Liên hệ</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
