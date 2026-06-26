const prisma = require('../config/prisma');
const { Prisma, TransactionStatus, TransactionType } = require('@prisma/client');
const crypto = require('crypto');
const { runFraudChecks } = require('../utils/fraudDetection');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calculatePercentChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

// ─── GET /wallet/fees ─────────────────────────────────────────────────────────

const getFees = async (req, res) => {
  try {
    const rules = await prisma.transactionFeeRule.findMany({
      select: { transaction_type: true, fee_value: true },
    });
    const fees = {};
    for (const rule of rules) {
      fees[rule.transaction_type] = Number(rule.fee_value);
    }
    return res.status(200).json({ success: true, fees });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /wallet/stats ───────────────────────────────────────────────────────

const getStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });

    const transactions = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.SUCCESS,
        OR: [{ sender_wallet_id: wallet.id }, { receiver_wallet_id: wallet.id }],
      },
      select: {
        amount: true,
        fee_amount: true,
        transaction_type: true,
        sender_wallet_id: true,
        receiver_wallet_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const monthlyDataMap = {};
    const categoryTotals = { Transfer: 0, Withdrawal: 0, Deposit: 0, Other: 0 };
    let totalIncome = 0;
    let totalSpent = 0;
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getMonth() + 1}/${d.getFullYear()}`;
      monthlyDataMap[label] = { month: label, income: 0, expense: 0 };
    }

    for (const tx of transactions) {
      const txDate = new Date(tx.created_at);
      const monthLabel = `${txDate.getMonth() + 1}/${txDate.getFullYear()}`;
      const isSender = tx.sender_wallet_id === wallet.id;
      const isReceiver = tx.receiver_wallet_id === wallet.id;
      const amount = Number(tx.amount);
      const feeAmount = Number(tx.fee_amount || 0);

      if (tx.transaction_type === TransactionType.DEPOSIT && isReceiver) {
        totalIncome += amount;
        if (monthlyDataMap[monthLabel]) monthlyDataMap[monthLabel].income += amount;
        categoryTotals.Deposit += amount;
      } else if (tx.transaction_type === TransactionType.WITHDRAW && isSender) {
        const cost = amount + feeAmount;
        totalSpent += cost;
        if (monthlyDataMap[monthLabel]) monthlyDataMap[monthLabel].expense += cost;
        categoryTotals.Withdrawal += cost;
      } else if (tx.transaction_type === TransactionType.TRANSFER) {
        if (isSender) {
          totalSpent += amount;
          if (monthlyDataMap[monthLabel]) monthlyDataMap[monthLabel].expense += amount;
          categoryTotals.Transfer += amount;
        }
        if (isReceiver) {
          totalIncome += amount;
          if (monthlyDataMap[monthLabel]) monthlyDataMap[monthLabel].income += amount;
        }
      } else {
        if (isSender) {
          totalSpent += amount;
          if (monthlyDataMap[monthLabel]) monthlyDataMap[monthLabel].expense += amount;
          categoryTotals.Other += amount;
        }
      }
    }

    const monthlyChart = Object.values(monthlyDataMap);
    const currentMonth = monthlyChart[monthlyChart.length - 1] || { income: 0, expense: 0 };
    const previousMonth = monthlyChart[monthlyChart.length - 2] || { income: 0, expense: 0 };

    const currentMonthTxs = transactions.filter((tx) => {
      const d = new Date(tx.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthTxs = transactions.filter((tx) => {
      const d = new Date(tx.created_at);
      return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear();
    });

    const distributionChart = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);

    return res.status(200).json({
      success: true,
      stats: {
        currentBalance: Number(wallet.balance) - Number(wallet.locked_balance),
        monthlyIncome: currentMonth.income,
        monthlyExpense: currentMonth.expense,
        incomeChange: calculatePercentChange(currentMonth.income, previousMonth.income),
        expenseChange: calculatePercentChange(currentMonth.expense, previousMonth.expense),
        transactionCount: currentMonthTxs.length,
        transactionChange: currentMonthTxs.length - previousMonthTxs.length,
        totalIncome,
        totalSpent,
        monthlyChart,
        distributionChart,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /wallet/transactions ─────────────────────────────────────────────────

const getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ sender_wallet_id: wallet.id }, { receiver_wallet_id: wallet.id }],
      },
      include: {
        sender_wallet: {
          include: { user: { select: { email: true } } },
        },
        receiver_wallet: {
          include: { user: { select: { email: true } } },
        },
        category: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json({ success: true, transactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /wallet/deposit ─────────────────────────────────────────────────────

const deposit = async (req, res) => {
  let transaction = null;
  try {
    const userId = req.user.userId;
    const { bankAccountId, amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // KYC must be verified before depositing
    const kyc = await prisma.userKyc.findUnique({ where: { user_id: userId } });
    if (!kyc || kyc.status !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        message: 'Account not verified KYC. Please complete KYC verification before depositing.',
      });
    }

    const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });

    const bank = await prisma.bankAccount.findUnique({
      where: { id: Number(bankAccountId) },
    });

    if (!bank || bank.wallet_id !== wallet.id) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }

    if (!bank.is_verified) {
      return res.status(400).json({ success: false, message: 'Bank account is not verified' });
    }

    const referenceCode = 'DEP-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');

    transaction = await prisma.transaction.create({
      data: {
        transaction_type: 'DEPOSIT',
        amount: new Prisma.Decimal(amount),
        fee_amount: new Prisma.Decimal(0),
        discount_amount: new Prisma.Decimal(0),
        final_amount: new Prisma.Decimal(amount),
        receiver_wallet_id: wallet.id,
        payment_method: 'BANK',
        bank_code: bank.bank_code,
        account_number: bank.account_number,
        account_name: bank.account_name,
        message: `Deposit from ${bank.bank_code}`,
        reference_code: referenceCode,
        status: 'PENDING',
      },
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'PROCESSING' },
    });

    // Simulate bank processing (demo)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const providerReferenceCode =
      'BANK-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');

    // Accounts ending with '9' simulate failure (demo)
    const isBankSuccess = !bank.account_number.endsWith('9');

    if (!isBankSuccess) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED', provider_reference_code: providerReferenceCode },
      });
      return res.status(400).json({
        success: false,
        message: 'Deposit failed: bank declined the transaction',
        status: 'FAILED',
        transactionId: transaction.id,
        referenceCode,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`;
      const currentWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      const balanceBefore = currentWallet.balance;
      const balanceAfter = balanceBefore.plus(new Prisma.Decimal(amount));

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: new Prisma.Decimal(amount) } },
      });

      await tx.ledgerEntry.create({
        data: {
          transaction_id: transaction.id,
          wallet_id: wallet.id,
          type: 'CREDIT',
          amount: new Prisma.Decimal(amount),
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'SUCCESS', provider_reference_code: providerReferenceCode },
      });
    });

    // Fetch updated wallet
    const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
    const fullTx = await prisma.transaction.findUnique({ where: { id: transaction.id } });

    // Notify user of successful deposit
    await prisma.notification.create({
      data: {
        user_id: userId,
        title: 'Deposit successful 💳',
        content: `Your wallet has been credited with ${Number(amount).toLocaleString('vi-VN')} ₫ from ${bank.bank_code} (Account: ${bank.account_number}). Transaction reference: ${referenceCode}.`,
      },
    }).catch(() => { /* non-critical – don't fail the response */ });

    return res.status(200).json({
      success: true,
      message: 'Deposit successful',
      status: 'SUCCESS',
      transactionId: transaction.id,
      referenceCode,
      transaction: fullTx,
      wallet: { balance: Number(updatedWallet.balance) - Number(updatedWallet.locked_balance) },
    });
  } catch (error) {
    if (transaction?.id) {
      try {
        const current = await prisma.transaction.findUnique({ where: { id: transaction.id } });
        if (current && current.status !== 'SUCCESS') {
          await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
        }
      } catch (_) { /* silent */ }
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /wallet/withdraw  (PIN already verified by pinMiddleware) ────────────

const withdraw = async (req, res) => {
  let transaction = null;
  try {
    const userId = req.user.userId;
    const { amount, bank_code, account_number, account_name, note } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    if (!bank_code || !account_number || !account_name) {
      return res.status(400).json({ success: false, message: 'Bank details are required' });
    }

    // KYC must be verified before withdrawing
    const kyc = await prisma.userKyc.findUnique({ where: { user_id: userId } });
    if (!kyc || kyc.status !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required. Please complete identity verification before withdrawing.',
      });
    }

    const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });

    const feeRule = await prisma.transactionFeeRule.findUnique({
      where: { transaction_type: 'WITHDRAW' },
    });
    const feeAmount = feeRule ? feeRule.fee_value : new Prisma.Decimal(0);
    const finalAmount = new Prisma.Decimal(amount).plus(feeAmount);

    const availableBefore = Number(wallet.balance) - Number(wallet.locked_balance);
    if (availableBefore < Number(finalAmount)) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const referenceCode = 'WDR-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');

    transaction = await prisma.transaction.create({
      data: {
        transaction_type: 'WITHDRAW',
        amount: new Prisma.Decimal(amount),
        fee_amount: feeAmount,
        discount_amount: new Prisma.Decimal(0),
        final_amount: finalAmount,
        sender_wallet_id: wallet.id,
        payment_method: 'BANK',
        bank_code,
        account_number,
        account_name,
        message: note || `Withdraw to ${bank_code} - ${account_number}`,
        reference_code: referenceCode,
        status: 'PENDING',
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`;
      const currentWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });

      const available = currentWallet.balance.minus(currentWallet.locked_balance);
      if (available.lt(finalAmount)) throw new Error('Insufficient balance');

      const balanceBefore = currentWallet.balance;
      const balanceAfter = balanceBefore.minus(finalAmount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: finalAmount } },
      });

      await tx.ledgerEntry.create({
        data: {
          transaction_id: transaction.id,
          wallet_id: wallet.id,
          type: 'DEBIT',
          amount: finalAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'SUCCESS' },
      });
    });

    const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
    const fullTx = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        sender_wallet: { include: { user: { select: { email: true } } } },
        receiver_wallet: { include: { user: { select: { email: true } } } },
      },
    });

    // Notify user of successful withdrawal
    await prisma.notification.create({
      data: {
        user_id: userId,
        title: 'Withdrawal successful 🏦',
        content: `${Number(amount).toLocaleString('vi-VN')} ₫ has been withdrawn to ${bank_code} (Account: ${account_number}). Reference: ${referenceCode}.`,
      },
    }).catch(() => { /* non-critical */ });

    runFraudChecks({
      userId,
      walletId: wallet.id,
      transactionId: transaction.id,
      transactionType: 'WITHDRAW',
      amount: Number(amount),
      availableBalanceBefore: availableBefore,
    }).catch((err) => console.error('Fraud check failed:', err));

    return res.status(200).json({
      success: true,
      message: 'Withdrawal successful',
      transactionId: transaction.id,
      referenceCode,
      transaction: fullTx,
      wallet: { balance: Number(updatedWallet.balance) - Number(updatedWallet.locked_balance) },
    });
  } catch (error) {
    if (transaction?.id) {
      try {
        const current = await prisma.transaction.findUnique({ where: { id: transaction.id } });
        if (current && current.status !== 'SUCCESS') {
          await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
        }
      } catch (_) { /* silent */ }
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /wallet/transfer  (PIN already verified by pinMiddleware) ───────────

const transfer = async (req, res) => {
  let transaction = null;
  try {
    const userId = req.user.userId;
    let { dest_email, amount, note, category_id, voucherCode } = req.body;

    if (!dest_email) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // KYC must be verified before transferring
    const kyc = await prisma.userKyc.findUnique({ where: { user_id: userId } });
    if (!kyc || kyc.status !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required. Please complete identity verification before transferring.',
      });
    }

    const senderWallet = await prisma.wallet.findUnique({ where: { user_id: userId } });

    const receiverAccount = await prisma.user.findFirst({
      where: { OR: [{ email: dest_email }, { phone: dest_email }] },
    });

    if (!receiverAccount) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }
    if (receiverAccount.id === userId) {
      return res.status(400).json({ success: false, message: 'Cannot transfer to yourself' });
    }
    if (receiverAccount.status === 'BANNED' || receiverAccount.status === 'LOCKED') {
      return res.status(403).json({ success: false, message: 'Recipient account is not active' });
    }

    const receiverWallet = await prisma.wallet.findUnique({
      where: { user_id: receiverAccount.id },
    });

    if (!receiverWallet) {
      return res.status(404).json({ success: false, message: 'Recipient wallet not found' });
    }
    if (receiverWallet.status === 'FROZEN') {
      return res.status(403).json({ success: false, message: 'Recipient wallet is frozen' });
    }

    note = note?.trim() || `Transfer to ${dest_email}`;

    let feeAmount = new Prisma.Decimal(0);
    let discountAmount = new Prisma.Decimal(0);
    let voucherId = null;
    let feeRuleId = null;

    const feeRule = await prisma.transactionFeeRule.findUnique({
      where: { transaction_type: 'TRANSFER' },
    });
    if (feeRule) {
      feeAmount = feeRule.fee_value;
      feeRuleId = feeRule.id;
    }

    if (voucherCode) {
      const voucher = await prisma.voucher.findUnique({ where: { code: voucherCode } });
      if (!voucher) {
        return res.status(404).json({ success: false, message: 'Voucher not found' });
      }
      if (
        voucher.status !== 'ACTIVE' ||
        voucher.expired_at < new Date() ||
        voucher.quantity <= voucher.used_count ||
        Number(amount) < Number(voucher.min_transaction_amount)
      ) {
        return res.status(400).json({ success: false, message: 'Voucher is invalid or expired' });
      }
      voucherId = voucher.id;
      discountAmount =
        voucher.discount_type === 'FIXED'
          ? voucher.discount_value
          : new Prisma.Decimal(amount).mul(voucher.discount_value).div(100);
    }

    const finalAmount = new Prisma.Decimal(amount).plus(feeAmount).minus(discountAmount);

    const availableBefore = Number(senderWallet.balance) - Number(senderWallet.locked_balance);
    if (availableBefore < Number(finalAmount)) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const referenceCode = 'TRF-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');

    transaction = await prisma.transaction.create({
      data: {
        transaction_type: 'TRANSFER',
        amount: new Prisma.Decimal(amount),
        fee_rule_id: feeRuleId,
        fee_amount: feeAmount,
        voucher_id: voucherId,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        sender_wallet_id: senderWallet.id,
        receiver_wallet_id: receiverWallet.id,
        payment_method: 'WALLET',
        message: note,
        category_id: category_id || null,
        reference_code: referenceCode,
        status: 'PENDING',
      },
    });

    await prisma.$transaction(async (tx) => {
      // Lock wallets in consistent order to avoid deadlock
      const firstId = Math.min(senderWallet.id, receiverWallet.id);
      const secondId = Math.max(senderWallet.id, receiverWallet.id);
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${firstId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${secondId} FOR UPDATE`;
      if (voucherId) {
        await tx.$queryRaw`SELECT id FROM vouchers WHERE id = ${voucherId} FOR UPDATE`;
      }

      const currentSender = await tx.wallet.findUnique({ where: { id: senderWallet.id } });
      const currentReceiver = await tx.wallet.findUnique({ where: { id: receiverWallet.id } });

      if (currentSender.balance.minus(currentSender.locked_balance).lt(finalAmount)) {
        throw new Error('Insufficient balance');
      }

      if (voucherId) {
        const v = await tx.voucher.findUnique({ where: { id: voucherId } });
        if (
          v.status !== 'ACTIVE' ||
          v.expired_at < new Date() ||
          v.quantity <= v.used_count ||
          Number(amount) < Number(v.min_transaction_amount)
        ) {
          throw new Error('Voucher is invalid');
        }
      }

      const senderBefore = currentSender.balance;
      const senderAfter = senderBefore.minus(finalAmount);
      const receiverBefore = currentReceiver.balance;
      const receiverAfter = receiverBefore.plus(new Prisma.Decimal(amount));

      await tx.wallet.update({ where: { id: senderWallet.id }, data: { balance: { decrement: finalAmount } } });
      await tx.wallet.update({ where: { id: receiverWallet.id }, data: { balance: { increment: new Prisma.Decimal(amount) } } });

      await tx.ledgerEntry.create({
        data: {
          transaction_id: transaction.id,
          wallet_id: senderWallet.id,
          type: 'DEBIT',
          amount: finalAmount,
          balance_before: senderBefore,
          balance_after: senderAfter,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          transaction_id: transaction.id,
          wallet_id: receiverWallet.id,
          type: 'CREDIT',
          amount: new Prisma.Decimal(amount),
          balance_before: receiverBefore,
          balance_after: receiverAfter,
        },
      });

      if (voucherId) {
        await tx.voucher.update({ where: { id: voucherId }, data: { used_count: { increment: 1 } } });
      }

      await tx.transaction.update({ where: { id: transaction.id }, data: { status: 'SUCCESS' } });
    });

    const updatedWallet = await prisma.wallet.findUnique({ where: { id: senderWallet.id } });
    const fullTx = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        sender_wallet: { include: { user: { select: { email: true } } } },
        receiver_wallet: { include: { user: { select: { email: true } } } },
      },
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        user_id: userId,
        title: 'Transfer sent 💸',
        content: `You sent ${Number(amount).toLocaleString('vi-VN')} ₫ to ${dest_email}. Reference: ${referenceCode}.`,
      },
    }).catch(() => { /* non-critical */ });

    // Notify receiver
    await prisma.notification.create({
      data: {
        user_id: receiverAccount.id,
        title: 'Money received 📥',
        content: `You received ${Number(amount).toLocaleString('vi-VN')} ₫ from ${fullTx.sender_wallet?.user?.email || 'another user'}. Reference: ${referenceCode}.`,
      },
    }).catch(() => { /* non-critical */ });

    runFraudChecks({
      userId,
      walletId: senderWallet.id,
      transactionId: transaction.id,
      transactionType: 'TRANSFER',
      amount: Number(amount),
      availableBalanceBefore: availableBefore,
    }).catch((err) => console.error('Fraud check failed:', err));

    return res.status(200).json({
      success: true,
      message: 'Transfer successful',
      transactionId: transaction.id,
      referenceCode,
      transaction: fullTx,
      wallet: { balance: Number(updatedWallet.balance) - Number(updatedWallet.locked_balance) },
    });
  } catch (error) {
    if (transaction?.id) {
      try {
        const current = await prisma.transaction.findUnique({ where: { id: transaction.id } });
        if (current && current.status !== 'SUCCESS') {
          await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
        }
      } catch (_) { /* silent */ }
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /wallet/payment (wallet to bank) ────────────────────────────────────

const payment = async (req, res) => {
  let transaction = null;
  try {
    const userId = req.user.userId;
    const { amount, bank_code, account_number, account_name, note, category_id } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    if (!bank_code || !account_number || !account_name) {
      return res.status(400).json({ success: false, message: 'Bank details are required' });
    }

    const kyc = await prisma.userKyc.findUnique({ where: { user_id: userId } });
    if (!kyc || kyc.status !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required. Please complete identity verification before making a bank payment.',
      });
    }

    const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const feeRule = await prisma.transactionFeeRule.findUnique({
      where: { transaction_type: 'PAYMENT' },
    });
    const feeAmount = feeRule ? feeRule.fee_value : new Prisma.Decimal(0);
    const feeRuleId = feeRule?.id ?? null;
    const finalAmount = new Prisma.Decimal(amount).plus(feeAmount);

    const availableBefore = Number(wallet.balance) - Number(wallet.locked_balance);
    if (availableBefore < Number(finalAmount)) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const referenceCode = 'PAY-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');

    // Check if the destination bank account is linked to a wallet in our system
    const recipientBank = await prisma.bankAccount.findFirst({
      where: { bank_code, account_number },
    });

    transaction = await prisma.transaction.create({
      data: {
        transaction_type: 'PAYMENT',
        amount: new Prisma.Decimal(amount),
        fee_rule_id: feeRuleId,
        fee_amount: feeAmount,
        discount_amount: new Prisma.Decimal(0),
        final_amount: finalAmount,
        sender_wallet_id: wallet.id,
        receiver_wallet_id: recipientBank ? recipientBank.wallet_id : null,
        payment_method: 'BANK',
        bank_code,
        account_number,
        account_name,
        message: note || `Bank payment to ${bank_code} - ${account_number}`,
        category_id: category_id || null,
        reference_code: referenceCode,
        status: 'PENDING',
      },
    });

    if (recipientBank) {
      // Intrasystem interbank sandbox transfer: credit receiver wallet
      await prisma.$transaction(async (tx) => {
        const firstId = Math.min(wallet.id, recipientBank.wallet_id);
        const secondId = Math.max(wallet.id, recipientBank.wallet_id);
        await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${firstId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${secondId} FOR UPDATE`;

        const currentSender = await tx.wallet.findUnique({ where: { id: wallet.id } });
        const currentReceiver = await tx.wallet.findUnique({ where: { id: recipientBank.wallet_id } });

        const currentAvailable = currentSender.balance.minus(currentSender.locked_balance);
        if (currentAvailable.lt(finalAmount)) throw new Error('Insufficient balance');

        const senderBefore = currentSender.balance;
        const senderAfter = senderBefore.minus(finalAmount);
        const receiverBefore = currentReceiver.balance;
        const receiverAfter = receiverBefore.plus(new Prisma.Decimal(amount));

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: finalAmount } },
        });

        await tx.wallet.update({
          where: { id: recipientBank.wallet_id },
          data: { balance: { increment: new Prisma.Decimal(amount) } },
        });

        await tx.ledgerEntry.create({
          data: {
            transaction_id: transaction.id,
            wallet_id: wallet.id,
            type: 'DEBIT',
            amount: finalAmount,
            balance_before: senderBefore,
            balance_after: senderAfter,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            transaction_id: transaction.id,
            wallet_id: recipientBank.wallet_id,
            type: 'CREDIT',
            amount: new Prisma.Decimal(amount),
            balance_before: receiverBefore,
            balance_after: receiverAfter,
          },
        });

        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'SUCCESS' },
        });
      });
    } else {
      // External sandbox bank payment: funds leave system
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`;
        const currentWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });

        const currentAvailable = currentWallet.balance.minus(currentWallet.locked_balance);
        if (currentAvailable.lt(finalAmount)) throw new Error('Insufficient balance');

        const balanceBefore = currentWallet.balance;
        const balanceAfter = balanceBefore.minus(finalAmount);

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: finalAmount } },
        });

        await tx.ledgerEntry.create({
          data: {
            transaction_id: transaction.id,
            wallet_id: wallet.id,
            type: 'DEBIT',
            amount: finalAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
          },
        });

        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'SUCCESS' },
        });
      });
    }

    const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
    const fullTx = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        sender_wallet: { include: { user: { select: { email: true } } } },
        receiver_wallet: { include: { user: { select: { email: true } } } },
      },
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        user_id: userId,
        title: 'Bank payment successful 🏦',
        content: `${Number(amount).toLocaleString('vi-VN')} ₫ has been sent to ${bank_code} (Account: ${account_number}). Reference: ${referenceCode}.`,
      },
    }).catch(() => { /* non-critical */ });

    // Notify receiver if they are in the system
    if (recipientBank) {
      const receiver = await prisma.wallet.findUnique({
        where: { id: recipientBank.wallet_id },
        include: { user: true }
      });
      if (receiver?.user) {
        await prisma.notification.create({
          data: {
            user_id: receiver.user.id,
            title: 'Nhận tiền từ ngân hàng liên kết 📥',
            content: `Bạn vừa nhận được ${Number(amount).toLocaleString('vi-VN')} ₫ chuyển khoản từ ngân hàng ${bank_code} (Số TK: ${account_number}). Mã giao dịch: ${referenceCode}.`,
          }
        }).catch(() => {});
      }
    }

    runFraudChecks({
      userId,
      walletId: wallet.id,
      transactionId: transaction.id,
      transactionType: 'PAYMENT',
      amount: Number(amount),
      availableBalanceBefore: availableBefore,
    }).catch((err) => console.error('Fraud check failed:', err));

    return res.status(200).json({
      success: true,
      message: 'Bank payment successful',
      transactionId: transaction.id,
      referenceCode,
      transaction: fullTx,
      wallet: { balance: Number(updatedWallet.balance) - Number(updatedWallet.locked_balance) },
    });
  } catch (error) {
    if (transaction?.id) {
      try {
        const current = await prisma.transaction.findUnique({ where: { id: transaction.id } });
        if (current && current.status !== 'SUCCESS') {
          await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
        }
      } catch (_) { /* silent */ }
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};  

const createQrDeposit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, bank_code = "SANDBOX_BANK" } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const kyc = await prisma.userKyc.findUnique({
      where: { user_id: userId },
    });

    if (!kyc || kyc.status !== "VERIFIED") {
      return res.status(403).json({
        success: false,
        message: "Account not verified KYC. Please complete KYC before QR deposit.",
      });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const referenceCode =
      "QRD-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");

    const transaction = await prisma.transaction.create({
      data: {
        transaction_type: "DEPOSIT",
        amount: new Prisma.Decimal(amount),
        fee_amount: new Prisma.Decimal(0),
        discount_amount: new Prisma.Decimal(0),
        final_amount: new Prisma.Decimal(amount),
        receiver_wallet_id: wallet.id,
        payment_method: "BANK",
        bank_code,
        account_number: `SW-WALLET-${wallet.id}`,
        account_name: "SMARTWALLET QR SANDBOX",
        message: `QR deposit sandbox ${referenceCode}`,
        reference_code: referenceCode,
        status: "PENDING",
      },
    });

    const qrPayload = JSON.stringify({
      type: "SMARTWALLET_QR_DEPOSIT",
      mode: "SANDBOX",
      transactionId: transaction.id,
      referenceCode,
      walletId: wallet.id,
      amount: Number(amount),
      bankCode: bank_code,
    });

    return res.status(201).json({
      success: true,
      message: "QR deposit created",
      qrPayload,
      transactionId: transaction.id,
      referenceCode,
      amount: Number(amount),
      status: "PENDING",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const confirmQrDeposit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: Number(transactionId) },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "QR transaction not found",
      });
    }

    if (transaction.receiver_wallet_id !== wallet.id) {
      return res.status(403).json({
        success: false,
        message: "This QR transaction does not belong to your wallet",
      });
    }

    if (transaction.status === "SUCCESS") {
      return res.status(409).json({
        success: false,
        message: "Transaction already confirmed",
      });
    }

    if (transaction.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction status",
      });
    }

    const providerReferenceCode =
      "QR-SANDBOX-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${wallet.id} FOR UPDATE`;

      const currentWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
      });

      const balanceBefore = currentWallet.balance;
      const balanceAfter = balanceBefore.plus(transaction.amount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: transaction.amount,
          },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transaction_id: transaction.id,
          wallet_id: wallet.id,
          type: "CREDIT",
          amount: transaction.amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          provider_reference_code: providerReferenceCode,
        },
      });
    });

    const updatedWallet = await prisma.wallet.findUnique({
      where: { id: wallet.id },
    });

    await prisma.notification.create({
      data: {
        user_id: userId,
        title: "QR deposit successful ✅",
        content: `${Number(transaction.amount).toLocaleString("vi-VN")} ₫ has been added to your SmartWallet via QR Sandbox. Reference: ${transaction.reference_code}.`,
      },
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "QR deposit successful",
      transactionId: transaction.id,
      referenceCode: transaction.reference_code,
      providerReferenceCode,
      wallet: {
        balance:
          Number(updatedWallet.balance) - Number(updatedWallet.locked_balance),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { getStats, getFees, getTransactions, deposit, withdraw, transfer, payment, createQrDeposit,
  confirmQrDeposit,};
