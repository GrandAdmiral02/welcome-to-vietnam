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

const PrivacyPage = () => {
  return (
    <GenericInfoPage title="Chính sách bảo mật">
      <p>Cập nhật lần cuối: 24 tháng 7, 2024</p>

      <p>
        Hippo Lovely ("chúng tôi") cam kết bảo vệ quyền riêng tư của bạn. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng, tiết lộ và bảo vệ thông tin của bạn khi bạn sử dụng Dịch vụ của chúng tôi.
      </p>

      <h2>1. Thông tin chúng tôi thu thập</h2>
      <p>
        Chúng tôi có thể thu thập thông tin nhận dạng cá nhân, chẳng hạn như tên, địa chỉ email, ảnh hồ sơ và các thông tin khác mà bạn cung cấp trực tiếp cho chúng tôi. Chúng tôi cũng thu thập thông tin phi cá nhân, chẳng hạn như dữ liệu sử dụng và thông tin thiết bị.
      </p>

      <h2>2. Cách chúng tôi sử dụng thông tin của bạn</h2>
      <p>
        Chúng tôi sử dụng thông tin thu thập được để:
      </p>
      <ul>
        <li>Cung cấp, vận hành và duy trì Dịch vụ của chúng tôi.</li>
        <li>Cải thiện, cá nhân hóa và mở rộng Dịch vụ của chúng tôi.</li>
        <li>Hiểu và phân tích cách bạn sử dụng Dịch vụ của chúng tôi.</li>
        <li>Giao tiếp với bạn, kể cả cho mục đích dịch vụ khách hàng.</li>
        <li>Ngăn chặn gian lận và bảo vệ an ninh cho Dịch vụ.</li>
      </ul>

      <h2>3. Chia sẻ thông tin của bạn</h2>
      <p>
        Chúng tôi không bán, trao đổi hoặc cho thuê thông tin nhận dạng cá nhân của bạn cho người khác. Chúng tôi có thể chia sẻ thông tin tổng hợp, phi cá nhân với các đối tác kinh doanh, chi nhánh đáng tin cậy và nhà quảng cáo.
      </p>

      <h2>4. Cookie và Công nghệ theo dõi</h2>
      <p>
        Chúng tôi sử dụng cookie và các công nghệ theo dõi tương tự để theo dõi hoạt động trên Dịch vụ của chúng tôi và lưu giữ một số thông tin nhất định. Bạn có thể hướng dẫn trình duyệt của mình từ chối tất cả cookie hoặc cho biết khi nào cookie đang được gửi.
      </p>

      <h2>5. Liên hệ với chúng tôi</h2>
      <p>
        Nếu bạn có bất kỳ câu hỏi nào về Chính sách bảo mật này, vui lòng liên hệ với chúng tôi qua email: privacy@hippolove.ly.
      </p>
    </GenericInfoPage>
  );
};

export default PrivacyPage;
