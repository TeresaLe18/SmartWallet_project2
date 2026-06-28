// Seed dữ liệu News mẫu song ngữ cho dashboard (Task 21 - Quản lý bài viết).
// Chạy: node src/seedNews.js
require('dotenv').config();
const prisma = require('./config/prisma');

const samplePosts = [
  {
    title: 'Ngân hàng Nhà nước giữ nguyên lãi suất điều hành để ổn định tăng trưởng kinh tế',
    title_en: 'State Bank of Vietnam maintains benchmark interest rates to stabilize economic growth',
    tag: 'Kinh tế',
    tag_en: 'Economy',
    time: 'Vừa xong',
    image: 'https://picsum.photos/seed/news-kinhte/800/450',
    link: '',
    content:
      'Nhằm tiếp tục thực hiện chủ trương của Chính phủ và Quốc hội về hỗ trợ tháo gỡ khó khăn cho nền kinh tế, Ngân hàng Nhà nước Việt Nam đã quyết định duy trì các mức lãi suất điều hành chủ chốt ở mức ổn định. Quyết định này đưa ra dựa trên phân tích kỹ lưỡng về diễn biến lạm phát trong nước, tỷ giá ngoại hối ổn định và xu hướng dịch chuyển dòng tiền trên thị trường quốc tế. Các chuyên gia kinh tế nhận định việc giữ nguyên mặt bằng lãi suất sẽ tạo điều kiện thuận lợi cho doanh nghiệp tiếp cận nguồn vốn giá rẻ để phục hồi sản xuất, đặc biệt là trong các lĩnh vực ưu tiên như xuất khẩu, công nghiệp phụ trợ và nông nghiệp công nghệ cao.',
    content_en:
      'In order to continue implementing the guidelines of the Government and the National Assembly on supporting the economy and removing obstacles for enterprises, the State Bank of Vietnam has decided to maintain its key operating interest rates steady. This decision was made based on a thorough analysis of domestic inflation control, stable foreign exchange rates, and international cash flow trends. Market analysts indicate that holding interest rates steady will create favorable conditions for businesses to access low-cost capital for production recovery, especially in prioritized sectors such as export, supporting industries, and high-tech agriculture.',
    active: true,
  },
  {
    title: 'Xu hướng thanh toán không tiền mặt bùng nổ: Ví điện tử Việt Nam thiết lập kỷ lục mới',
    title_en: 'Cashless payment boom: Vietnamese e-wallets set new transaction records',
    tag: 'Fintech',
    tag_en: 'Fintech',
    time: '1 giờ trước',
    image: 'https://picsum.photos/seed/news-fintech/800/450',
    link: '',
    content:
      'Theo thống kê mới nhất từ các cơ quan quản lý, doanh số giao dịch qua ví điện tử và cổng thanh toán QR tại Việt Nam đã thiết lập đỉnh lịch sử mới trong quý này. Sự thay đổi hành vi tiêu dùng từ tiền mặt sang thanh toán số diễn ra mạnh mẽ trên khắp cả nước, từ các đô thị lớn đến khu vực nông thôn nhờ vào sự phổ cập của mã VietQR tiện lợi. Các nhà phát triển Fintech đang tích cực đẩy mạnh hợp tác với các ngân hàng thương mại để nâng cấp hạ tầng thanh toán số, đồng thời tích hợp thêm các công nghệ bảo mật tiên tiến như xác thực sinh trắc học thông minh và phát hiện gian lận thời gian thực nhằm bảo vệ tuyệt đối số dư của người tiêu dùng.',
    content_en:
      'According to the latest statistics from regulatory agencies, transaction volume through e-wallets and QR payment gateways in Vietnam has reached a record high this quarter. The shift in consumer behavior from cash to digital payments is taking place rapidly across the country, from major cities to rural areas, thanks to the widespread adoption of the convenient VietQR code. Fintech developers are actively collaborating with commercial banks to upgrade digital payment infrastructure while integrating advanced security technologies such as biometric authentication and real-time fraud detection to protect consumer funds.',
    active: true,
  },
  {
    title: 'Ứng dụng Trí tuệ Nhân tạo (AI) trong quản lý tài chính cá nhân trở thành tiêu chuẩn 2026',
    title_en: 'Artificial Intelligence (AI) in personal financial management becomes the 2026 standard',
    tag: 'Công nghệ',
    tag_en: 'Technology',
    time: '3 giờ trước',
    image: 'https://picsum.photos/seed/news-congnghe/800/450',
    link: '',
    content:
      'Công nghệ Trí tuệ Nhân tạo (AI) đang nhanh chóng thay đổi cách người tiêu dùng quản lý dòng tiền của mình. Thay vì ghi chép thủ công như trước đây, người dùng hiện tại có thể sử dụng các trợ lý tài chính thông minh tích hợp ngay trong ví điện tử để tự động phân tích hành vi tiêu dùng, lập biểu đồ thu chi trực quan và đưa ra cảnh báo khi chi tiêu vượt hạn mức. Trợ lý AI còn phân tích thói quen mua sắm để gợi ý các gói tiết kiệm tích lũy linh hoạt hoặc đề xuất các ưu đãi giảm giá phù hợp với nhu cầu thực tế của từng cá nhân, mở ra một kỷ nguyên tài chính số thông minh và cá nhân hóa sâu sắc.',
    content_en:
      'Artificial Intelligence (AI) technology is rapidly reshaping how consumers manage their cash flows. Instead of manual bookkeeping, users can now rely on smart financial assistants integrated directly into e-wallets to automatically analyze spending behaviors, generate visual charts, and receive alerts when budget limits are exceeded. Furthermore, the AI assistant analyzes shopping habits to suggest flexible savings packages or recommend discount vouchers tailored to individual needs, leading to a new era of highly personalized and intelligent digital finance.',
    active: true,
  },
  {
    title: 'Nhà đầu tư ngoại tăng cường gom ròng cổ phiếu công nghệ và tài chính',
    title_en: 'Foreign investors aggressively net buy tech and financial shares',
    tag: 'Đầu tư',
    tag_en: 'Investment',
    time: 'Hôm qua',
    image: 'https://picsum.photos/seed/news-dautu/800/450',
    link: '',
    content:
      'Thị trường chứng khoán Việt Nam ghi nhận sự trở lại mạnh mẽ của dòng vốn nước ngoài với những phiên mua ròng liên tục trị giá hàng nghìn tỷ đồng. Trọng tâm của đợt giải ngân này tập trung chủ yếu vào các doanh nghiệp công nghệ lớn và các ngân hàng thương mại có nền tảng bán lẻ vững chắc. Các quỹ đầu tư quốc tế bày tỏ sự lạc quan vào triển vọng tăng trưởng kinh tế vĩ mô ổn định của Việt Nam, cũng như chiến lược chuyển đổi số toàn diện đang diễn ra trong ngành tài chính ngân hàng. Tuy nhiên, các chuyên gia khuyến nghị nhà đầu tư cá nhân nên thận trọng theo dõi diễn biến tỷ giá và phân bổ danh mục đầu tư hợp lý.',
    content_en:
      'The Vietnamese stock market recorded a strong comeback of foreign capital with continuous net buying sessions worth trillions of VND. The focus of this cash disbursement is primarily on major tech corporations and commercial banks with solid retail foundations. International investment funds express optimism in Vietnam\'s stable macroeconomic growth prospects as well as the comprehensive digital transformation strategy in the banking and finance sector. However, experts recommend that individual investors carefully monitor exchange rate fluctuations and maintain a diversified investment portfolio.',
    active: true,
  },
  {
    title: 'Thị trường ví điện tử Việt Nam dự kiến tăng trưởng mạnh mẽ trong 5 năm tới',
    title_en: 'Vietnam\'s e-wallet market projected to grow rapidly over the next 5 years',
    tag: 'Thị trường',
    tag_en: 'Market',
    time: '2 ngày trước',
    image: 'https://picsum.photos/seed/news-thitruong/800/450',
    link: '',
    content:
      'Một báo cáo phân tích thị trường mới đây dự đoán quy mô giao dịch thanh toán di động tại Việt Nam sẽ tiếp tục duy trì mức tăng trưởng hàng năm ở mức hai chữ số. Sự hỗ trợ đắc lực từ chính sách phát triển kinh tế số của chính phủ, cùng với tỷ lệ sử dụng điện thoại thông minh vượt trội của thế hệ trẻ là những động cơ chính đẩy nhanh quá trình này. Cuộc đua nâng cấp công nghệ và tung ra các chương trình hoàn tiền, khuyến mãi hấp dẫn giữa các ứng dụng ví điện tử hứa hẹn sẽ mang lại trải nghiệm tiện ích cao nhất và tối ưu hóa lợi ích kinh tế cho hàng triệu người tiêu dùng.',
    content_en:
      'A recent market analysis report predicts that the mobile payment transaction volume in Vietnam will continue to maintain double-digit annual growth rates. The strong support from the government\'s digital economic policy combined with the high smartphone penetration rate among the younger generation are key drivers of this acceleration. The race to upgrade technologies and launch attractive cashbacks or promotion programs among e-wallet apps promises to deliver premium experiences and optimize financial benefits for millions of consumers.',
    active: true,
  },
];

async function main() {
  console.log('Clearing existing news posts...');
  await prisma.newsPost.deleteMany({});
  
  const result = await prisma.newsPost.createMany({ data: samplePosts });
  console.log(`✅ Đã seed thành công ${result.count} bài News mẫu song ngữ.`);
}

main()
  .catch((err) => {
    console.error('Seed News thất bại:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
