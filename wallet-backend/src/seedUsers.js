// Seed/refresh tài khoản test đăng nhập: 1 admin + 3 user (ví 100,000,000 VND mỗi user thường).
// Chạy: node src/seedUsers.js
// Quy ước mật khẩu mỗi tài khoản = <phần trước @ của email> + "@123456"
//   vd: thuan@smartwallet.com -> thuan@123456 ; admin@smartwallet.com -> admin@123456
// Re-runnable: email đã tồn tại -> CẬP NHẬT mật khẩu + role (không tạo trùng, không đụng số dư ví).
require('dotenv').config();
const prisma = require('./config/prisma');
const bcrypt = require('bcrypt');

const PASS_SUFFIX = '@123456';

const USERS = [
  { email: 'thuan@smartwallet.com', role: 'USER', balance: 100000000 },
  { email: 'duyen@smartwallet.com', role: 'USER', balance: 100000000 },
  { email: 'phong@smartwallet.com', role: 'USER', balance: 100000000 },
  { email: 'rajpham@gmail.com', role: 'USER', balance: 100000000 },
];

async function main() {
  for (const u of USERS) {
    const username = u.email.split('@')[0];
    const plain = username + PASS_SUFFIX; // thuan@123456, 
    const password = await bcrypt.hash(plain, 10);

    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: { password, role: u.role },
      });
      console.log(`UPDATE ${u.email.padEnd(24)} role ${u.role.padEnd(5)} | mật khẩu '${plain}'`);
      continue;
    }

    const data = { email: u.email, password, role: u.role };
    if (u.balance != null) {
      data.wallet = { create: { balance: u.balance } };
    }

    const user = await prisma.user.create({ data });
    const walletInfo =
      u.balance != null ? ` | ví ${u.balance.toLocaleString('vi-VN')} VND` : '';
    console.log(
      `CREATE ${u.email.padEnd(24)} role ${u.role.padEnd(5)} | mật khẩu '${plain}'${walletInfo} -> id ${user.id}`
    );
  }

  console.log('\nQuy ước mật khẩu: <tên trước @ của email>@123456  (vd: thuan@123456, admin@123456).');
}

main()
  .catch((err) => {
    console.error('Seed users thất bại:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
