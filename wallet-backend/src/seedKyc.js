// Đặt KYC = VERIFIED cho 1 tài khoản test để qua gate KYC (chuyển/nạp/rút).
// Chạy: node src/seedKyc.js
// Idempotent: nếu user đã có KYC -> chỉ đổi status sang VERIFIED (không ghi đè ảnh/thông tin thật).
require('dotenv').config();
const prisma = require('./config/prisma');

const TARGET_EMAILS = ['thuan@smartwallet.com', 'rajpham@gmail.com'];

async function main() {
  for (const email of TARGET_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('Không tìm thấy user:', email);
      continue;
    }

    const name = email.split('@')[0];
    const fullName = name === 'rajpham' ? 'Raj Pham' : 'Nguyễn Văn Thuận';
    const nationalId = name === 'rajpham' ? '079200067890' : '079200012345';

    // Dữ liệu KYC mẫu (ảnh là placeholder — chỉ để thoả ràng buộc bắt buộc của schema).
    const createData = {
      user_id: user.id,
      national_id: nationalId,
      full_name: fullName,
      date_of_birth: new Date('2000-01-01'),
      gender: 'Nam',
      address: 'Việt Nam',
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

    console.log(`✅ KYC của ${email} (user id ${user.id}) -> ${kyc.status}`);

    // Seed linked bank account so they can receive sandbox interbank transfers in real-time
    const wallet = await prisma.wallet.findUnique({ where: { user_id: user.id } });
    if (wallet) {
      const bankCode = 'Vietcombank';
      const accountNumber = email === 'rajpham@gmail.com' ? '0967373148' : '1234567890';
      const accountName = fullName;

      await prisma.bankAccount.upsert({
        where: { bank_code_account_number: { bank_code: bankCode, account_number: accountNumber } },
        update: { is_verified: true },
        create: {
          wallet_id: wallet.id,
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
          is_verified: true,
        },
      });
      console.log(`   ✓ Linked Bank: ${bankCode} - ${accountNumber} (${accountName})`);
    }
  }
}

main()
  .catch((e) => { console.error('seedKyc lỗi:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
