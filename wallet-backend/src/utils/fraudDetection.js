const prisma = require('../config/prisma');

const MEDIUM_AMOUNT_THRESHOLD = 300_000_000;
const VELOCITY_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const VELOCITY_MIN_COUNT = 5; // > 5 means 6 or more

const fmtVnd = (n) => `${Number(n).toLocaleString('vi-VN')} VND`;

const createFraudLog = async ({ userId, transactionId, reason, severity }) => {
  return prisma.fraudLog.create({
    data: {
      user_id: userId,
      transaction_id: transactionId ?? null,
      reason,
      severity,
    },
  });
};

const countRecentWithdrawOrDeposit = async (userId) => {
  const since = new Date(Date.now() - VELOCITY_WINDOW_MS);
  return prisma.transaction.count({
    where: {
      status: 'SUCCESS',
      created_at: { gte: since },
      OR: [
        {
          transaction_type: 'WITHDRAW',
          sender_wallet: { user_id: userId },
        },
        {
          transaction_type: 'DEPOSIT',
          receiver_wallet: { user_id: userId },
        },
      ],
    },
  });
};

const freezeWalletForFraud = async (walletId, userId) => {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet || wallet.status === 'FROZEN') return false;

  await prisma.wallet.update({
    where: { id: walletId },
    data: {
      status: 'FROZEN',
      freeze_reason: 'ADMIN_REQUEST',
    },
  });

  await prisma.notification.create({
    data: {
      user_id: userId,
      title: 'Wallet frozen for security',
      content:
        'Your wallet was automatically frozen after multiple high-risk alerts. Please contact support.',
    },
  }).catch(() => {});

  return true;
};

/**
 * Run fraud rules after a successful transaction.
 * @param {object} ctx
 * @param {number} ctx.userId
 * @param {number} ctx.walletId
 * @param {number} ctx.transactionId
 * @param {string} ctx.transactionType - TRANSFER | WITHDRAW | PAYMENT | DEPOSIT
 * @param {number} ctx.amount - transaction principal amount
 * @param {number} [ctx.availableBalanceBefore] - available balance before debit
 */
const runFraudChecks = async (ctx) => {
  const { userId, walletId, transactionId, transactionType, amount } = ctx;
  const amt = Number(amount);

  // Rule 1 (MEDIUM): Transfer/Withdrawal amount exceeds or equals 300,000,000 VND
  if (
    amt >= MEDIUM_AMOUNT_THRESHOLD &&
    (transactionType === 'TRANSFER' || transactionType === 'WITHDRAW')
  ) {
    await createFraudLog({
      userId,
      transactionId,
      severity: 'MEDIUM',
      reason: `Transfer/Withdrawal amount reaches or exceeds 300,000,000 VND (${fmtVnd(amt)})`,
    });
  }

  // Rule 2 (HIGH): Withdraw/Deposit transaction count > 5 within 2 minutes -> Freeze Wallet
  const recentCount = await countRecentWithdrawOrDeposit(userId);
  if (recentCount > VELOCITY_MIN_COUNT) {
    // 1. Log the HIGH severity event
    await createFraudLog({
      userId,
      transactionId,
      severity: 'HIGH',
      reason: `Withdraw/Deposit transaction count exceeds 5 within 2 minutes (${recentCount} detected)`,
    });

    // 2. Automatically freeze the wallet immediately
    const frozen = await freezeWalletForFraud(walletId, userId);
    await createFraudLog({
      userId,
      transactionId,
      severity: 'CRITICAL',
      reason: frozen
        ? `Automatic wallet freeze triggered by high frequency withdraw/deposit transactions`
        : `Wallet already frozen`,
    });
  }
};

module.exports = {
  runFraudChecks,
  MEDIUM_AMOUNT_THRESHOLD,
  VELOCITY_MIN_COUNT,
};
