const prisma = require('../config/prisma');

const PERIODS = ['week', 'month', 'year'];

// Tính khoảng [from, to) theo period quanh ngày tham chiếu ref.
function computeRange(period, ref) {
  const base = ref ? new Date(ref) : new Date();
  if (isNaN(base.getTime())) throw new Error('date không hợp lệ');

  if (period === 'week') {
    const from = new Date(base);
    from.setHours(0, 0, 0, 0);
    const dow = (from.getDay() + 6) % 7; // 0 = Thứ Hai
    from.setDate(from.getDate() - dow);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    return { from, to };
  }
  if (period === 'year') {
    const from = new Date(base.getFullYear(), 0, 1);
    const to = new Date(base.getFullYear() + 1, 0, 1);
    return { from, to };
  }
  // month (mặc định)
  const from = new Date(base.getFullYear(), base.getMonth(), 1);
  const to = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { from, to };
}

// Số tiền "đã chi" của 1 giao dịch (ưu tiên final_amount nếu > 0).
function spentAmount(tx) {
  const fin = Number(tx.final_amount);
  return fin > 0 ? fin : Number(tx.amount);
}

// GET /api/statistics/spending?period=week|month|year&date=ISO
const getSpending = async (req, res) => {
  try {
    const userId = req.user.userId;
    const period = PERIODS.includes(req.query.period) ? req.query.period : 'month';

    let range;
    try {
      range = computeRange(period, req.query.date);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });
    if (!wallet) {
      return res.status(200).json({ success: true, period, range, totalSpending: 0, currency: 'VND', byCategory: [] });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        sender_wallet_id: wallet.id,
        status: 'SUCCESS',
        created_at: { gte: range.from, lt: range.to },
      },
      include: { category: { select: { id: true, name: true } } },
    });

    const map = new Map(); // key categoryId|null -> {categoryId, categoryName, total, count}
    let totalSpending = 0;
    for (const tx of transactions) {
      const spent = spentAmount(tx);
      totalSpending += spent;
      const key = tx.category_id ?? 'null';
      if (!map.has(key)) {
        map.set(key, {
          categoryId: tx.category_id ?? null,
          categoryName: tx.category ? tx.category.name : 'Không phân loại',
          total: 0,
          count: 0,
        });
      }
      const row = map.get(key);
      row.total += spent;
      row.count += 1;
    }

    const byCategory = Array.from(map.values()).sort((a, b) => b.total - a.total);

    return res.status(200).json({
      success: true,
      period,
      range,
      totalSpending,
      currency: wallet.currency || 'VND',
      byCategory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSpending };
