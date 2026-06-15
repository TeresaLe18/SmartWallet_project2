// Seed dữ liệu News mẫu cho dashboard (Task 21 - Quản lý bài viết).
// Chạy: node src/seedNews.js
// An toàn: nếu bảng đã có bài thì BỎ QUA (không tạo trùng).
require('dotenv').config();
const prisma = require('./config/prisma');

// Tag khớp đúng danh sách chuyên mục trong AdminMedia.jsx:
// "Kinh tế", "Fintech", "Công nghệ", "Đầu tư", "Thị trường".
const samplePosts = [
  {
    title: 'Ngân hàng Nhà nước giữ nguyên lãi suất điều hành trong quý này',
    tag: 'Kinh tế',
    time: 'Vừa xong',
    image: 'https://picsum.photos/seed/news-kinhte/800/450',
    link: '',
    content:
      'Ngân hàng Nhà nước quyết định giữ nguyên các mức lãi suất điều hành nhằm ổn định ' +
      'thị trường tiền tệ và hỗ trợ tăng trưởng. Giới phân tích cho rằng động thái này ' +
      'giúp doanh nghiệp tiếp cận vốn với chi phí ổn định hơn trong nửa cuối năm.',
    active: true,
  },
  {
    title: 'Ví điện tử tăng tốc: thanh toán không tiền mặt lập kỷ lục mới',
    tag: 'Fintech',
    time: '1 giờ trước',
    image: 'https://picsum.photos/seed/news-fintech/800/450',
    link: '',
    content:
      'Số lượng giao dịch qua ví điện tử tiếp tục tăng mạnh khi người dùng chuyển dịch ' +
      'sang thanh toán QR và chuyển khoản tức thời. Các nền tảng đẩy mạnh tính năng bảo mật ' +
      'như xác thực PIN và cảnh báo giao dịch bất thường để bảo vệ người dùng.',
    active: true,
  },
  {
    title: 'AI cá nhân hóa quản lý chi tiêu: xu hướng tài chính số 2026',
    tag: 'Công nghệ',
    time: '3 giờ trước',
    image: 'https://picsum.photos/seed/news-congnghe/800/450',
    link: '',
    content:
      'Các trợ lý tài chính tích hợp AI giúp người dùng theo dõi chi tiêu theo danh mục, ' +
      'dự báo dòng tiền và đưa ra gợi ý tiết kiệm. Công nghệ này đang dần trở thành tính năng ' +
      'tiêu chuẩn trên các ứng dụng ví và ngân hàng số.',
    active: true,
  },
  {
    title: 'Dòng vốn ngoại trở lại, nhà đầu tư kỳ vọng vào nhóm tài chính',
    tag: 'Đầu tư',
    time: 'Hôm qua',
    image: 'https://picsum.photos/seed/news-dautu/800/450',
    link: '',
    content:
      'Khối ngoại mua ròng trở lại trong những phiên gần đây, tập trung vào nhóm cổ phiếu ' +
      'ngân hàng và công nghệ tài chính. Chuyên gia khuyến nghị nhà đầu tư cân nhắc khẩu vị ' +
      'rủi ro và phân bổ danh mục hợp lý thay vì chạy theo tâm lý đám đông.',
    active: true,
  },
  {
    title: 'Thị trường thanh toán số Việt Nam được dự báo tăng trưởng hai chữ số',
    tag: 'Thị trường',
    time: '2 ngày trước',
    image: 'https://picsum.photos/seed/news-thitruong/800/450',
    link: '',
    content:
      'Báo cáo mới nhất dự báo thị trường thanh toán số tiếp tục tăng trưởng hai chữ số ' +
      'nhờ độ phủ smartphone cao và hạ tầng thanh toán mở rộng. Cạnh tranh giữa các ví ' +
      'và ngân hàng số được kỳ vọng mang lại nhiều ưu đãi hơn cho người dùng.',
    active: true,
  },
];

async function main() {
  const existing = await prisma.newsPost.count();
  if (existing > 0) {
    console.log(
      `Đã có ${existing} bài News trong DB → bỏ qua seed để tránh trùng. ` +
        'Nếu muốn seed lại, xoá dữ liệu bảng news_posts trước.'
    );
    return;
  }

  const result = await prisma.newsPost.createMany({ data: samplePosts });
  console.log(`Đã seed ${result.count} bài News mẫu.`);
}

main()
  .catch((err) => {
    console.error('Seed News thất bại:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
