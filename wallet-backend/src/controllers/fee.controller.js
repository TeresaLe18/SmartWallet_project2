const prisma = require('../config/prisma');

// Phí dịch vụ theo loại giao dịch (TransactionFeeRule). Mỗi transaction_type 1 rule (unique).
const TRANSACTION_TYPES = ['TRANSFER', 'WITHDRAW', 'PAYMENT', 'DEPOSIT'];

const listFees = async (req, res) => {
  try {
    const data = await prisma.transactionFeeRule.findMany({ orderBy: { transaction_type: 'asc' } });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getFee = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const fee = await prisma.transactionFeeRule.findUnique({ where: { id } });
    if (!fee) return res.status(404).json({ success: false, message: 'Fee rule not found' });
    return res.status(200).json({ success: true, data: fee });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createFee = async (req, res) => {
  try {
    const { transactionType, feeValue } = req.body || {};
    if (!TRANSACTION_TYPES.includes(transactionType)) {
      return res.status(400).json({ success: false, message: `transactionType phải thuộc: ${TRANSACTION_TYPES.join(', ')}` });
    }
    const value = Number(feeValue);
    if (!Number.isFinite(value) || value < 0) {
      return res.status(400).json({ success: false, message: 'feeValue phải là số >= 0' });
    }
    const existed = await prisma.transactionFeeRule.findUnique({ where: { transaction_type: transactionType } });
    if (existed) return res.status(409).json({ success: false, message: 'Đã có rule phí cho loại giao dịch này' });

    const fee = await prisma.transactionFeeRule.create({ data: { transaction_type: transactionType, fee_value: value } });
    return res.status(201).json({ success: true, data: fee });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateFee = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const existed = await prisma.transactionFeeRule.findUnique({ where: { id } });
    if (!existed) return res.status(404).json({ success: false, message: 'Fee rule not found' });

    const { transactionType, feeValue } = req.body || {};
    const data = {};
    if (transactionType !== undefined) {
      if (!TRANSACTION_TYPES.includes(transactionType)) {
        return res.status(400).json({ success: false, message: `transactionType phải thuộc: ${TRANSACTION_TYPES.join(', ')}` });
      }
      data.transaction_type = transactionType;
    }
    if (feeValue !== undefined) {
      const value = Number(feeValue);
      if (!Number.isFinite(value) || value < 0) return res.status(400).json({ success: false, message: 'feeValue phải là số >= 0' });
      data.fee_value = value;
    }

    const fee = await prisma.transactionFeeRule.update({ where: { id }, data });
    return res.status(200).json({ success: true, data: fee });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Loại giao dịch đã có rule phí' });
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteFee = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const existed = await prisma.transactionFeeRule.findUnique({ where: { id } });
    if (!existed) return res.status(404).json({ success: false, message: 'Fee rule not found' });
    await prisma.transactionFeeRule.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { listFees, getFee, createFee, updateFee, deleteFee };
