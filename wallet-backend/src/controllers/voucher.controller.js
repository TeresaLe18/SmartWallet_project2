const prisma = require('../config/prisma');

const VOUCHER_TYPES = ['FIXED', 'PERCENT'];
const VOUCHER_STATUSES = ['ACTIVE', 'EXPIRED', 'DISABLED'];

// Tính số tiền giảm (cap không vượt quá amount).
function computeDiscount(voucher, amount) {
  const value = Number(voucher.discount_value);
  let discount = voucher.discount_type === 'FIXED' ? value : (amount * value) / 100;
  if (discount > amount) discount = amount;
  return Math.round(discount);
}

const listVouchers = async (req, res) => {
  try {
    const where = {};
    if (req.query.status && VOUCHER_STATUSES.includes(req.query.status)) where.status = req.query.status;
    const data = await prisma.voucher.findMany({ where, orderBy: { id: 'desc' } });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getVoucher = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const v = await prisma.voucher.findUnique({ where: { id } });
    if (!v) return res.status(404).json({ success: false, message: 'Voucher not found' });
    return res.status(200).json({ success: true, data: v });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createVoucher = async (req, res) => {
  try {
    const { code, discountType, discountValue, minTransactionAmount, quantity, expiredAt, status, title, description, tag, hot } = req.body || {};

    if (!code || !String(code).trim()) return res.status(400).json({ success: false, message: 'code là bắt buộc' });
    if (!VOUCHER_TYPES.includes(discountType)) return res.status(400).json({ success: false, message: `discountType phải thuộc: ${VOUCHER_TYPES.join(', ')}` });
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ success: false, message: 'discountValue phải là số > 0' });
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) return res.status(400).json({ success: false, message: 'quantity phải là số nguyên > 0' });
    const exp = new Date(expiredAt);
    if (isNaN(exp.getTime())) return res.status(400).json({ success: false, message: 'expiredAt không hợp lệ' });
    const st = status || 'ACTIVE';
    if (!VOUCHER_STATUSES.includes(st)) return res.status(400).json({ success: false, message: `status phải thuộc: ${VOUCHER_STATUSES.join(', ')}` });

    const v = await prisma.voucher.create({
      data: {
        code: String(code).trim(),
        discount_type: discountType,
        discount_value: value,
        min_transaction_amount: Number(minTransactionAmount) || 0,
        quantity: qty,
        expired_at: exp,
        status: st,
        title: title || null,
        description: description || null,
        tag: tag || null,
        hot: !!hot,
      },
    });
    return res.status(201).json({ success: true, data: v });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Mã voucher đã tồn tại' });
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const existed = await prisma.voucher.findUnique({ where: { id } });
    if (!existed) return res.status(404).json({ success: false, message: 'Voucher not found' });

    const { code, discountType, discountValue, minTransactionAmount, quantity, expiredAt, status, title, description, tag, hot } = req.body || {};
    const data = {};
    if (code !== undefined) data.code = String(code).trim();
    if (discountType !== undefined) {
      if (!VOUCHER_TYPES.includes(discountType)) return res.status(400).json({ success: false, message: 'discountType không hợp lệ' });
      data.discount_type = discountType;
    }
    if (discountValue !== undefined) {
      const value = Number(discountValue);
      if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ success: false, message: 'discountValue phải > 0' });
      data.discount_value = value;
    }
    if (minTransactionAmount !== undefined) data.min_transaction_amount = Number(minTransactionAmount) || 0;
    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty <= 0) return res.status(400).json({ success: false, message: 'quantity phải > 0' });
      data.quantity = qty;
    }
    if (expiredAt !== undefined) {
      const exp = new Date(expiredAt);
      if (isNaN(exp.getTime())) return res.status(400).json({ success: false, message: 'expiredAt không hợp lệ' });
      data.expired_at = exp;
    }
    if (status !== undefined) {
      if (!VOUCHER_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'status không hợp lệ' });
      data.status = status;
    }
    if (title !== undefined) data.title = title || null;
    if (description !== undefined) data.description = description || null;
    if (tag !== undefined) data.tag = tag || null;
    if (hot !== undefined) data.hot = !!hot;

    const v = await prisma.voucher.update({ where: { id }, data });
    return res.status(200).json({ success: true, data: v });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Mã voucher đã tồn tại' });
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const existed = await prisma.voucher.findUnique({ where: { id } });
    if (!existed) return res.status(404).json({ success: false, message: 'Voucher not found' });
    await prisma.voucher.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/vouchers/check — user xem trước số tiền giảm (không tiêu thụ voucher).
const checkVoucher = async (req, res) => {
  try {
    const { code, amount } = req.body || {};
    if (!code) return res.status(400).json({ success: false, message: 'code là bắt buộc' });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'amount không hợp lệ' });

    const v = await prisma.voucher.findUnique({ where: { code: String(code).trim() } });
    if (!v) return res.status(404).json({ success: false, message: 'Voucher không tồn tại' });

    if (v.status !== 'ACTIVE') return res.status(400).json({ success: false, message: 'Voucher không còn hiệu lực' });
    if (new Date(v.expired_at) < new Date()) return res.status(400).json({ success: false, message: 'Voucher đã hết hạn' });
    if (v.used_count >= v.quantity) return res.status(400).json({ success: false, message: 'Voucher đã hết lượt' });
    if (amt < Number(v.min_transaction_amount)) {
      return res.status(400).json({ success: false, message: `Giao dịch tối thiểu ${Number(v.min_transaction_amount).toLocaleString('vi-VN')}₫ để dùng voucher` });
    }

    const discountAmount = computeDiscount(v, amt);
    return res.status(200).json({
      success: true,
      valid: true,
      code: v.code,
      discountType: v.discount_type,
      discountValue: Number(v.discount_value),
      discountAmount,
      finalAmount: amt - discountAmount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/vouchers — danh sách voucher đang hiệu lực (cho user: Offers + dropdown Wallets).
const listActiveVouchers = async (req, res) => {
  try {
    const now = new Date();
    const all = await prisma.voucher.findMany({
      where: { status: 'ACTIVE', expired_at: { gt: now } },
      orderBy: { id: 'desc' },
    });
    const data = all.filter((v) => v.used_count < v.quantity); // còn lượt dùng
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { listVouchers, getVoucher, createVoucher, updateVoucher, deleteVoucher, checkVoucher, listActiveVouchers };
