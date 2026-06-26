const prisma = require('../config/prisma');

const HIGH_AMOUNT_THRESHOLD = 20_000_000;
const VELOCITY_WINDOW_MS = 3 * 60 * 1000;
const VELOCITY_MIN_COUNT = 5;
const TRANSFER_BALANCE_RATIO = 0.9;
const HIGH_ALERT_WINDOW_MS = 24 * 60 * 60 * 1000;
const HIGH_ALERT_THRESHOLD = 3;

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

const countRecentOutgoingTransactions = async (userId) => {
  const since = new Date(Date.now() - VELOCITY_WINDOW_MS);
  return prisma.transaction.count({
    where: {
      status: 'SUCCESS',
      created_at: { gte: since },
      sender_wallet: { user_id: userId },
    },
  });
};

const countHighAlertsIn24h = async (userId) => {
  const since = new Date(Date.now() - HIGH_ALERT_WINDOW_MS);
  return prisma.fraudLog.count({
    where: {
      user_id: userId,
      severity: 'HIGH',
      created_at: { gte: since },
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
 * Run fraud rules after a successful outgoing transaction.
 * @param {object} ctx
 * @param {number} ctx.userId
 * @param {number} ctx.walletId
 * @param {number} ctx.transactionId
 * @param {string} ctx.transactionType - TRANSFER | WITHDRAW | PAYMENT
 * @param {number} ctx.amount - transaction principal amount
 * @param {number} [ctx.availableBalanceBefore] - available balance before debit
 */
const runFraudChecks = async (ctx) => {
  const { userId, walletId, transactionId, transactionType, amount } = ctx;
  const availableBefore = Number(ctx.availableBalanceBefore ?? 0);
  const amt = Number(amount);

  // Rule 1: Transaction amount exceeds 20,000,000 VND → HIGH
  if (amt > HIGH_AMOUNT_THRESHOLD) {
    await createFraudLog({
      userId,
      transactionId,
      severity: 'HIGH',
      reason: `Transaction amount exceeds 20,000,000 VND (${fmtVnd(amt)})`,
    });
  }

  // Rule 2: 5+ outgoing transactions within 3 minutes → MEDIUM
  const recentCount = await countRecentOutgoingTransactions(userId);
  if (recentCount >= VELOCITY_MIN_COUNT) {
    await createFraudLog({
      userId,
      transactionId,
      severity: 'MEDIUM',
      reason: `5 or more transactions within 3 minutes (${recentCount} outgoing transactions detected)`,
    });
  }

  // Rule 3: Transfer amount ≥ 90% of available balance → HIGH
  if (
    transactionType === 'TRANSFER' &&
    availableBefore > 0 &&
    amt / availableBefore >= TRANSFER_BALANCE_RATIO
  ) {
    const pct = ((amt / availableBefore) * 100).toFixed(1);
    await createFraudLog({
      userId,
      transactionId,
      severity: 'HIGH',
      reason: `Transfer amount is 90% or more of available balance (${pct}% — ${fmtVnd(amt)} of ${fmtVnd(availableBefore)})`,
    });
  }

  // Rule 4: 3+ HIGH alerts in 24 hours → CRITICAL + freeze wallet
  const highCount = await countHighAlertsIn24h(userId);
  if (highCount >= HIGH_ALERT_THRESHOLD) {
    const frozen = await freezeWalletForFraud(walletId, userId);
    await createFraudLog({
      userId,
      transactionId,
      severity: 'CRITICAL',
      reason: frozen
        ? `3 HIGH severity fraud alerts within 24 hours (${highCount} detected) — wallet frozen automatically`
        : `3 HIGH severity fraud alerts within 24 hours (${highCount} detected) — wallet already frozen`,
    });
  }
};

module.exports = {
  runFraudChecks,
  HIGH_AMOUNT_THRESHOLD,
  VELOCITY_MIN_COUNT,
  TRANSFER_BALANCE_RATIO,
  HIGH_ALERT_THRESHOLD,
};
