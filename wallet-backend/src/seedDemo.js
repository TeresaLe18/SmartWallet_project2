// Seed dữ liệu DEMO để test các tính năng vừa merge: categories, vouchers, fees,
// giao dịch (cho statistics) và notifications (cho notification-read).
// Chạy: node src/seedDemo.js — idempotent (upsert theo khoá unique; tx/notif chỉ seed nếu trống).
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
    }
  }

  // ── SEEDING FOR rajpham@gmail.com ──
  const raj = await prisma.user.findUnique({ where: { email: 'rajpham@gmail.com' }, include: { wallet: true } });
  if (raj?.wallet) {
    // 1. Clear existing transactions to prevent double-seeding and allow clean 2-year chart representation
    const rajTxIds = (await prisma.transaction.findMany({
      where: {
        OR: [
          { sender_wallet_id: raj.wallet.id },
          { receiver_wallet_id: raj.wallet.id }
        ]
      },
      select: { id: true }
    })).map(t => t.id);

    if (rajTxIds.length > 0) {
      await prisma.fraudLog.deleteMany({ where: { transaction_id: { in: rajTxIds } } });
      await prisma.ledgerEntry.deleteMany({ where: { transaction_id: { in: rajTxIds } } });
      await prisma.transaction.deleteMany({ where: { id: { in: rajTxIds } } });
    }

    console.log('Cleared existing transactions for rajpham@gmail.com for re-seeding...');

    // 2. Generate 2-year history
    // Start balance at 15,000,000, build up through salary and spendings, ending at 100,000,000
    let balance = 15000000;
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);

    const now = new Date();
    const categoriesList = ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Hóa đơn'];
    
    // Create seed transactions
    let currentDate = new Date(startDate);
    let salaryDayCount = 1;
    let transactionsCreatedCount = 0;

    while (currentDate < now) {
      // Monthly Salary deposit
      if (currentDate.getDate() === 1 || salaryDayCount === 1) {
        const salaryAmt = 25000000;
        const balanceBefore = balance;
        balance += salaryAmt;

        const tx = await prisma.transaction.create({
          data: {
            transaction_type: 'DEPOSIT',
            amount: salaryAmt,
            final_amount: salaryAmt,
            payment_method: 'BANK',
            status: 'SUCCESS',
            receiver_wallet_id: raj.wallet.id,
            message: `Lương tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`,
            created_at: new Date(currentDate),
          }
        });

        await prisma.ledgerEntry.create({
          data: {
            transaction_id: tx.id,
            wallet_id: raj.wallet.id,
            type: 'CREDIT',
            amount: salaryAmt,
            balance_before: balanceBefore,
            balance_after: balance,
            created_at: new Date(currentDate),
          }
        });

        salaryDayCount = 0; // reset
        transactionsCreatedCount++;
      }

      // Weekly spendings (1 to 3 items)
      const numSpendings = Math.floor(Math.random() * 3) + 1;
      for (let s = 0; s < numSpendings; s++) {
        const category = categoriesList[Math.floor(Math.random() * categoriesList.length)];
        let spendAmt = 0;

        if (category === 'Ăn uống') spendAmt = Math.floor(Math.random() * 300000) + 50000;
        else if (category === 'Di chuyển') spendAmt = Math.floor(Math.random() * 150000) + 20000;
        else if (category === 'Mua sắm') spendAmt = Math.floor(Math.random() * 1500000) + 200000;
        else if (category === 'Hóa đơn') spendAmt = Math.floor(Math.random() * 1200000) + 300000;

        if (balance > spendAmt) {
          const balanceBefore = balance;
          balance -= spendAmt;

          const tx = await prisma.transaction.create({
            data: {
              transaction_type: 'PAYMENT',
              amount: spendAmt,
              final_amount: spendAmt,
              payment_method: 'WALLET',
              status: 'SUCCESS',
              sender_wallet_id: raj.wallet.id,
              category_id: cats[category],
              message: `Thanh toán ${category}`,
              created_at: new Date(currentDate),
            }
          });

          await prisma.ledgerEntry.create({
            data: {
              transaction_id: tx.id,
              wallet_id: raj.wallet.id,
              type: 'DEBIT',
              amount: spendAmt,
              balance_before: balanceBefore,
              balance_after: balance,
              created_at: new Date(currentDate),
            }
          });

          transactionsCreatedCount++;
        }
      }

      // Add random transfers (both send and receive)
      if (Math.random() < 0.15 && balance > 500000) {
        const transferAmt = Math.floor(Math.random() * 2000000) + 100000;
        const isReceive = Math.random() < 0.4;
        const partner = isReceive ? 'thuan@smartwallet.com' : 'phong@smartwallet.com';
        
        const balanceBefore = balance;
        if (isReceive) {
          balance += transferAmt;
        } else {
          balance -= transferAmt;
        }

        const tx = await prisma.transaction.create({
          data: {
            transaction_type: 'TRANSFER',
            amount: transferAmt,
            final_amount: transferAmt,
            payment_method: 'WALLET',
            status: 'SUCCESS',
            sender_wallet_id: isReceive ? null : raj.wallet.id,
            receiver_wallet_id: isReceive ? raj.wallet.id : null,
            message: isReceive ? `Nhận tiền từ ${partner}` : `Chuyển tiền cho ${partner}`,
            created_at: new Date(currentDate),
          }
        });

        await prisma.ledgerEntry.create({
          data: {
            transaction_id: tx.id,
            wallet_id: raj.wallet.id,
            type: isReceive ? 'CREDIT' : 'DEBIT',
            amount: transferAmt,
            balance_before: balanceBefore,
            balance_after: balance,
            created_at: new Date(currentDate),
          }
        });
        transactionsCreatedCount++;
      }

      // Step forward by 4-6 days
      currentDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 3) + 4);
      if (currentDate.getDate() < 7) {
        salaryDayCount = 1; // trigger salary next loop if beginning of month
      }
    }

    // Update wallet final balance to match running balance
    await prisma.wallet.update({
      where: { id: raj.wallet.id },
      data: { balance: balance }
    });

    console.log(`Successfully seeded ${transactionsCreatedCount} transactions for rajpham@gmail.com over 2 years.`);

    // 3. Seed 6 Months of Savings / Investments
    await prisma.investment.deleteMany({ where: { user_id: raj.id } });
    
    // Seed some closed mature investments in the past 6 months
    const invData = [
      // 1. Closed mature investment: Term 3 months, opened 6 months ago, matures 3 months ago
      {
        user_id: raj.id,
        amount: 20000000,
        term_months: 3,
        interest_rate: 5.80,
        start_date: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        end_date: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        status: 'WITHDRAWN',
        accumulated_interest: Math.round(20000000 * 0.058 * (3 / 12)),
        withdrawn_at: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        payout_amount: 20000000 + Math.round(20000000 * 0.058 * (3 / 12)),
      },
      // 2. Closed early investment (withdrawn early): Term 6 months, opened 4 months ago, withdrawn 2 months ago
      {
        user_id: raj.id,
        amount: 10000000,
        term_months: 6,
        interest_rate: 7.60,
        start_date: new Date(new Date().setMonth(new Date().getMonth() - 4)),
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 2)),
        status: 'WITHDRAWN',
        accumulated_interest: Math.round(10000000 * 0.002 * (60 / 365)), // 60 days flexible penalty
        withdrawn_at: new Date(new Date().setMonth(new Date().getMonth() - 2)),
        payout_amount: 10000000 + Math.round(10000000 * 0.002 * (60 / 365)),
      },
      // 3. Active investment: Term 6 months, opened 2 months ago, matures in 4 months
      {
        user_id: raj.id,
        amount: 30000000,
        term_months: 6,
        interest_rate: 7.60,
        start_date: new Date(new Date().setMonth(new Date().getMonth() - 2)),
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 4)),
        status: 'ACTIVE',
        accumulated_interest: 0,
      },
      // 4. Active flexible investment: Term 0, opened 1 month ago
      {
        user_id: raj.id,
        amount: 15000000,
        term_months: 0,
        interest_rate: 0.20,
        start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        end_date: null,
        status: 'ACTIVE',
        accumulated_interest: 0,
      }
    ];

    for (const inv of invData) {
      await prisma.investment.create({ data: inv });
    }
    console.log('Seeded 4 savings/investments records for rajpham@gmail.com.');

    // 4. Seed Savings Vaults ("ví nhỏ")
    await prisma.savingsVault.deleteMany({ where: { user_id: raj.id } });
    const vaultData = [
      { user_id: raj.id, name: 'Ví tiết kiệm Nimo', target_amount: 20000000, current_amount: 7500000, category: 'Trà sữa' },
      { user_id: raj.id, name: 'Mua sắm Tết', target_amount: 15000000, current_amount: 3000000, category: 'Mua sắm' },
      { user_id: raj.id, name: 'Quỹ Du lịch Hè', target_amount: 30000000, current_amount: 12000000, category: 'Di chuyển' },
      { user_id: raj.id, name: 'Điện nước & Hóa đơn', target_amount: 5000000, current_amount: 2500000, category: 'Hóa đơn' },
    ];
    for (const vault of vaultData) {
      await prisma.savingsVault.create({ data: vault });
    }
    console.log('Seeded 4 savings vaults for rajpham@gmail.com.');

    // 5. Seed some notifications
    await prisma.notification.deleteMany({ where: { user_id: raj.id } });
    await prisma.notification.createMany({
      data: [
        { user_id: raj.id, title: 'Bảo mật tài khoản', content: 'Vui lòng xác minh KYC để mở khóa đầy đủ tính năng nạp rút tiền.' },
        { user_id: raj.id, title: 'Ưu đãi cực khủng', content: 'Chào hè rực rỡ cùng voucher MUASAM10 giảm ngay 10%!' },
        { user_id: raj.id, title: 'Chúc mừng', content: 'Chào mừng bạn đến với SmartWallet - hệ sinh thái tài chính số.' },
      ]
    });
    console.log('Seeded 3 notification logs for rajpham@gmail.com.');
  }
}

main()
  .catch((e) => { console.error('seedDemo lỗi:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
