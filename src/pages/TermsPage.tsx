const GenericInfoPage = ({ title, children }) => (
  <div className="bg-background py-12">
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="space-y-8 prose prose-zinc dark:prose-invert max-w-none">
        <h1 className="text-4xl font-bold border-b pb-4">{title}</h1>
        {children}
      </div>
    </div>
  </div>
);

const TermsPage = () => {
  return (
    <GenericInfoPage title="Điều khoản dịch vụ">
      <p>Cập nhật lần cuối: 24 tháng 7, 2024</p>

      <p>
        Chào mừng bạn đến với Hippo Lovely! Các điều khoản dịch vụ này ('Điều khoản') chi phối việc bạn truy cập và sử dụng trang web, dịch vụ và ứng dụng của chúng tôi ('Dịch vụ'). Vui lòng đọc kỹ các Điều khoản này.
      </p>

      <h2>1. Chấp nhận Điều khoản</h2>
      <p>
        Bằng cách truy cập hoặc sử dụng Dịch vụ của chúng tôi, bạn đồng ý bị ràng buộc bởi các Điều khoản này và Chính sách bảo mật của chúng tôi. Nếu bạn không đồng ý với các Điều khoản này, vui lòng không truy cập hoặc sử dụng Dịch vụ.
      </p>

      <h2>2. Thay đổi Điều khoản</h2>
      <p>
        Chúng tôi có quyền sửa đổi các Điều khoản này bất cứ lúc nào. Nếu chúng tôi thực hiện các thay đổi, chúng tôi sẽ thông báo cho bạn bằng cách đăng các điều khoản đã sửa đổi trên Dịch vụ. Việc bạn tiếp tục sử dụng Dịch vụ sau khi các thay đổi đó có hiệu lực sẽ cấu thành sự chấp nhận của bạn đối với các Điều khoản mới.
      </p>

      <h2>3. Hành vi của Người dùng</h2>
      <ul>
        <li>Bạn chịu trách nhiệm hoàn toàn về hành vi của mình và bất kỳ dữ liệu, văn bản, thông tin, tên màn hình, đồ họa, ảnh, hồ sơ, clip âm thanh và video, liên kết ('Nội dung') nào mà bạn gửi, đăng và hiển thị trên Dịch vụ.</li>
        <li>Bạn không được lạm dụng, quấy rối, đe dọa, mạo danh hoặc đe dọa những người dùng khác.</li>
        <li>Bạn không được đăng tải nội dung bất hợp pháp, xúc phạm, khiêu dâm, hoặc có thể gây khó chịu.</li>
      </ul>

      <h2>4. Chấm dứt</h2>
      <p>
        Chúng tôi có thể chấm dứt hoặc đình chỉ quyền truy cập của bạn vào Dịch vụ ngay lập tức, không cần thông báo trước hoặc chịu trách nhiệm, vì bất kỳ lý do gì, bao gồm nhưng không giới hạn nếu bạn vi phạm các Điều khoản.
      </p>

      <h2>5. Liên hệ với chúng tôi</h2>
      <p>
        Nếu bạn có bất kỳ câu hỏi nào về các Điều khoản này, vui lòng liên hệ với chúng tôi qua email: support@hippolove.ly.
      </p>
    </GenericInfoPage>
  );
};

export default TermsPage;
