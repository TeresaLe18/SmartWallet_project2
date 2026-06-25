// Seed dữ liệu DEMO để test các tính năng vừa merge: categories, vouchers, fees,
// giao dịch (cho statistics) và notifications (cho notification-read).
// Chạy: node src/seedDemo.js   — idempotent (upsert theo khoá unique; tx/notif chỉ seed nếu trống).
require('dotenv').config();
const prisma = require('./config/prisma');

async function main() {
  // ── Categories (upsert theo name) ──
  const catNames = ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Hóa đơn'];
  const cats = {};
  for (const name of catNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    cats[name] = c.id;
  }
  console.log('Categories :', Object.keys(cats).length);

  // ── Vouchers (upsert theo code) ──
  const vouchers = [
    { code: 'CHUYENTIEN50', discount_type: 'FIXED',   discount_value: 50000, min_transaction_amount: 500000, quantity: 100, expired_at: new Date('2026-12-31'), status: 'ACTIVE', title: 'Giảm 50K phí chuyển tiền', description: 'Áp dụng giao dịch từ 500K', tag: 'Chuyển tiền', hot: true },
    { code: 'MUASAM10',     discount_type: 'PERCENT', discount_value: 10,    min_transaction_amount: 0,      quantity: 50,  expired_at: new Date('2026-09-30'), status: 'ACTIVE', title: 'Giảm 10% mua sắm',       description: 'Tối đa 200K',          tag: 'Mua sắm',     hot: false },
    { code: 'BILL30',       discount_type: 'FIXED',   discount_value: 30000, min_transaction_amount: 100000, quantity: 200, expired_at: new Date('2026-06-30'), status: 'ACTIVE', title: 'Giảm 30K hóa đơn',       description: 'Thanh toán hóa đơn',   tag: 'Hóa đơn',     hot: true },
  ];
  for (const v of vouchers) {
    await prisma.voucher.upsert({ where: { code: v.code }, update: v, create: v });
  }
  console.log('Vouchers   :', vouchers.length);

  // ── Fee rules (upsert theo transaction_type unique) ──
  const fees = [
    { transaction_type: 'TRANSFER', fee_value: 0 },
    { transaction_type: 'WITHDRAW', fee_value: 5000 },
    { transaction_type: 'PAYMENT', fee_value: 3000 },
  ];
  for (const f of fees) {
    await prisma.transactionFeeRule.upsert({ where: { transaction_type: f.transaction_type }, update: { fee_value: f.fee_value }, create: f });
  }
  console.log('Fee rules  :', fees.length);

  // ── Giao dịch + thông báo cho thuan (để có dữ liệu cho statistics + notification-read) ──
  const thuan = await prisma.user.findUnique({ where: { email: 'thuan@smartwallet.com' }, include: { wallet: true } });
  if (thuan?.wallet) {
    const existingTx = await prisma.transaction.count({ where: { sender_wallet_id: thuan.wallet.id } });
    if (existingTx === 0) {
      const demoTx = [
        { category: 'Ăn uống',   amount: 150000 },
        { category: 'Ăn uống',   amount: 90000 },
        { category: 'Di chuyển', amount: 60000 },
        { category: 'Mua sắm',   amount: 320000 },
        { category: 'Hóa đơn',   amount: 250000 },
      ];
      for (const t of demoTx) {
        await prisma.transaction.create({
          data: {
            transaction_type: 'PAYMENT',
            amount: t.amount,
            final_amount: t.amount,
            payment_method: 'WALLET',
            status: 'SUCCESS',
            sender_wallet_id: thuan.wallet.id,
            category_id: cats[t.category],
            message: `Demo ${t.category}`,
          },
        });
      }
      console.log('Demo tx    :', demoTx.length, '(cho thuan)');
    } else {
      console.log('Demo tx    : bỏ qua (thuan đã có', existingTx, 'giao dịch)');
    }

    const existingNotif = await prisma.notification.count({ where: { user_id: thuan.id } });
    if (existingNotif === 0) {
      await prisma.notification.createMany({
        data: [
          { user_id: thuan.id, title: 'Chào mừng', content: 'Tài khoản của bạn đã sẵn sàng.' },
          { user_id: thuan.id, title: 'Khuyến mãi mới', content: 'Voucher CHUYENTIEN50 đang chờ bạn.' },
          { user_id: thuan.id, title: 'Bảo mật', content: 'Hãy đặt mã PIN giao dịch.' },
        ],
      });
      console.log('Notifs     : 3 (cho thuan)');
    } else {
      console.log('Notifs     : bỏ qua (thuan đã có', existingNotif, 'thông báo)');
    }
  }
}

main()
  .catch((e) => { console.error('seedDemo lỗi:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
