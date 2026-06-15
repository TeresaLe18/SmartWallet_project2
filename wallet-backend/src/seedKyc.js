// Đặt KYC = VERIFIED cho 1 tài khoản test để qua gate KYC (chuyển/nạp/rút).
// Chạy: node src/seedKyc.js
// Idempotent: nếu user đã có KYC -> chỉ đổi status sang VERIFIED (không ghi đè ảnh/thông tin thật).
require('dotenv').config();
const prisma = require('./config/prisma');

const TARGET_EMAIL = 'thuan@smartwallet.com';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    console.log('Không tìm thấy user:', TARGET_EMAIL);
    return;
  }

  // Dữ liệu KYC mẫu (ảnh là placeholder — chỉ để thoả ràng buộc bắt buộc của schema).
  const createData = {
    user_id: user.id,
    national_id: '079200012345',
    full_name: 'Nguyễn Văn Thuận',
    date_of_birth: new Date('2000-01-01'),
    gender: 'Nam',
    address: 'Hà Nội, Việt Nam',
    front_image: 'seed-kyc-front.jpg',
    back_image: 'seed-kyc-back.jpg',
    selfie_image: 'seed-kyc-selfie.jpg',
    status: 'VERIFIED',
  };

  const kyc = await prisma.userKyc.upsert({
    where: { user_id: user.id },
    update: { status: 'VERIFIED' }, // đã có KYC -> chỉ duyệt
    create: createData,             // chưa có -> tạo bản đã duyệt
  });

  console.log(`✅ KYC của ${TARGET_EMAIL} (user id ${user.id}) -> ${kyc.status}`);
}

main()
  .catch((e) => { console.error('seedKyc lỗi:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
