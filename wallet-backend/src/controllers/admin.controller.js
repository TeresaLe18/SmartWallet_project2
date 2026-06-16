const prisma = require('../config/prisma');

// ─── Users ────────────────────────────────────────────────────────────────────

const listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: "ADMIN",
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        created_at: true,
        wallet: {
          select: { balance: true, locked_balance: true, status: true },
        },
        kyc: {
          select: {
            id: true,
            full_name: true,
            national_id: true,
            date_of_birth: true,
            gender: true,
            address: true,
            status: true,
            message: true,
            front_image: true,
            back_image: true,
            selfie_image: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const userDetail = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: {
          include: {
            bank_accounts: true,
            ledger_entries: { take: 20, orderBy: { created_at: 'desc' } },
            sent_transactions: { take: 20, orderBy: { created_at: 'desc' } },
            received_transactions: { take: 20, orderBy: { created_at: 'desc' } },
          },
        },
        kyc: true,
        fraud_logs: true,
        notifications: { take: 20, orderBy: { created_at: 'desc' } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { password, refreshToken, pin_hash, ...safeUser } = user;
    return res.status(200).json({ success: true, data: safeUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// REACTIVATE ACCOUNT
const reactivateAccount = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (existingUser.status !== 'DISABLED') {
      return res.status(409).json({
        success: false,
        message: 'Only disabled accounts can be reactivated',
      });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

      await tx.wallet.updateMany({
        where: {
          user_id: userId,
          status: 'FROZEN',
          freeze_reason: 'ACCOUNT_DISABLED',
        },
        data: {
          status: 'ACTIVE',
          freeze_reason: null,
        },
      });

      return updatedUser;
    });

    return res.status(200).json({
      success: true,
      message: 'Account reactivated successfully',
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const lockUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (existingUser.status === 'LOCKED') {
      return res.status(409).json({
        success: false,
        message: 'User is already locked',
      });
    }

    if (existingUser.status === 'DISABLED') {
      return res.status(409).json({
        success: false,
        message: 'Disabled account cannot be locked',
      });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { status: 'LOCKED' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

      await tx.wallet.updateMany({
        where: {
          user_id: userId,
          status: 'ACTIVE',
        },
        data: {
          status: 'FROZEN',
          freeze_reason: 'ACCOUNT_LOCKED',
        },
      });

      return updatedUser;
    });

    return res.status(200).json({
      success: true,
      message: 'User locked successfully',
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const unlockUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (existingUser.status !== 'LOCKED') {
      return res.status(409).json({
        success: false,
        message: 'User is not locked',
      });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

      await tx.wallet.updateMany({
        where: {
          user_id: userId,
          status: 'FROZEN',
          freeze_reason: 'ACCOUNT_LOCKED',
        },
        data: {
          status: 'ACTIVE',
          freeze_reason: null,
        },
      });

      return updatedUser;
    });

    return res.status(200).json({
      success: true,
      message: 'User unlocked successfully',
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ─── Wallets ──────────────────────────────────────────────────────────────────

const freezeWallet = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        wallet: { select: { id: true, status: true, freeze_reason: true } },
      },
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (existingUser.status === 'DISABLED') {
      return res.status(409).json({
        success: false,
        message: 'Cannot freeze wallet: account is disabled. Reactivate the account instead.',
      });
    }

    if (existingUser.status === 'LOCKED') {
      return res.status(409).json({
        success: false,
        message: 'Cannot freeze wallet: account is locked. Unlock the account instead.',
      });
    }

    if (!existingUser.wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (existingUser.wallet.status === 'FROZEN') {
      return res.status(409).json({
        success: false,
        message: 'Wallet is already frozen',
      });
    }

    const wallet = await prisma.wallet.update({
      where: { user_id: userId },
      data: {
        status: 'FROZEN',
        freeze_reason: 'ADMIN_REQUEST',
      },
      select: { id: true, balance: true, locked_balance: true, status: true, freeze_reason: true },
    });

    return res.status(200).json({ success: true, message: 'Wallet frozen', data: wallet });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const unfreezeWallet = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        wallet: { select: { id: true, status: true, freeze_reason: true } },
      },
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (existingUser.status === 'DISABLED') {
      return res.status(409).json({
        success: false,
        message: 'Cannot unfreeze wallet: account is disabled. Reactivate the account first.',
      });
    }

    if (existingUser.status === 'LOCKED') {
      return res.status(409).json({
        success: false,
        message: 'Cannot unfreeze wallet: account is locked. Unlock the account instead.',
      });
    }

    if (!existingUser.wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (existingUser.wallet.status !== 'FROZEN') {
      return res.status(409).json({
        success: false,
        message: 'Wallet is not frozen',
      });
    }

    const { freeze_reason: freezeReason } = existingUser.wallet;
    if (freezeReason === 'ACCOUNT_DISABLED' || freezeReason === 'ACCOUNT_LOCKED') {
      return res.status(409).json({
        success: false,
        message:
          freezeReason === 'ACCOUNT_DISABLED'
            ? 'Cannot unfreeze wallet: frozen because account is disabled. Reactivate the account instead.'
            : 'Cannot unfreeze wallet: frozen because account is locked. Unlock the account instead.',
      });
    }

    const wallet = await prisma.wallet.update({
      where: { user_id: userId },
      data: {
        status: 'ACTIVE',
        freeze_reason: null,
      },
      select: { id: true, balance: true, locked_balance: true, status: true, freeze_reason: true },
    });

    return res.status(200).json({ success: true, message: 'Wallet unfrozen', data: wallet });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── KYC ─────────────────────────────────────────────────────────────────────

const getKycSubmissions = async (req, res) => {
  try {
    const submissions = await prisma.userKyc.findMany({
      include: {
        user: { select: { id: true, email: true, phone: true, status: true } },
      },
      orderBy: { id: 'desc' },
    });
    return res.status(200).json({ success: true, submissions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Unified KYC review — :id is the USER's id (matches frontend usage)
const reviewKyc = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { status, reason } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be VERIFIED or REJECTED' });
    }

    const kyc = await prisma.userKyc.update({
      where: { user_id: userId },
      data: {
        status,
        ...(status === 'REJECTED' && reason ? { message: reason } : {}),
      },
    });

    // Notify the user
    await prisma.notification.create({
      data: {
        user_id: userId,
        title: status === 'VERIFIED' ? 'KYC xác minh thành công ✅' : 'Hồ sơ KYC bị từ chối ❌',
        content:
          status === 'VERIFIED'
            ? 'Tài khoản của bạn đã được xác minh danh tính. Toàn bộ tính năng giao dịch đã được mở khoá.'
            : reason || 'Hồ sơ KYC của bạn không đạt yêu cầu. Vui lòng gửi lại.',
      },
    });

    return res.status(200).json({
      success: true,
      message: `KYC ${status.toLowerCase()} successfully`,
      kyc,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Transactions ─────────────────────────────────────────────────────────────

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        sender_wallet: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                kyc: { select: { full_name: true } },
              },
            },
          },
        },
        receiver_wallet: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                kyc: { select: { full_name: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json({ success: true, transactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const reviewTransaction = async (req, res) => {
  try {
    const txId = Number(req.params.id);
    const { status } = req.body;

    if (!['SUCCESS', 'FAILED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be SUCCESS or FAILED' });
    }

    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

    if (tx.status !== 'PENDING' && tx.status !== 'PROCESSING') {
      return res.status(400).json({
        success: false,
        message: 'Only PENDING or PROCESSING transactions can be reviewed',
      });
    }

    const updated = await prisma.transaction.update({
      where: { id: txId },
      data: { status },
    });

    return res.status(200).json({ success: true, transaction: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Fraud Logs ───────────────────────────────────────────────────────────────

const getFraudLogs = async (req, res) => {
  try {
    const logs = await prisma.fraudLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            kyc: { select: { full_name: true } },
          },
        },
        transaction: {
          select: {
            id: true,
            reference_code: true,
            amount: true,
            transaction_type: true,
            status: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return res.status(200).json({ success: true, fraudLogs: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resolveFraudLog = async (req, res) => {
  try {
    const logId = Number(req.params.id);
    await prisma.fraudLog.delete({ where: { id: logId } });
    return res.status(200).json({ success: true, message: 'Fraud log resolved and dismissed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listUsers,
  userDetail,
  reactivateAccount,
  lockUser,
  unlockUser,
  freezeWallet,
  unfreezeWallet,
  getKycSubmissions,
  reviewKyc,
  getAllTransactions,
  reviewTransaction,
  getFraudLogs,
  resolveFraudLog,
};
