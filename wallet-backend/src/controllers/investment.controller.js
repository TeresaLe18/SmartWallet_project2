const prisma = require('../config/prisma');

const enrichInvestment = (inv) => {
  if (inv.status === 'WITHDRAWN') {
    return {
      ...inv,
      accruedInterest: Number(inv.accumulated_interest),
    };
  }

  const startDate = new Date(inv.start_date);
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - startDate.getTime());
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let accrued = 0;
  const amount = Number(inv.amount);
  const rate = Number(inv.interest_rate) / 100;

  if (inv.term_months === 0) {
    accrued = amount * rate * (daysPassed / 365);
  } else {
    const endDate = new Date(inv.end_date);
    const isMature = now >= endDate;

    if (isMature) {
      accrued = amount * rate * (inv.term_months / 12);
    } else {
      const flexibleRate = 0.002;
      accrued = amount * flexibleRate * (daysPassed / 365);
    }
  }

  return {
    ...inv,
    accruedInterest: Math.round(accrued),
  };
};

// GET /investments - Get all investments for the user
const getAllInvestments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const investments = await prisma.investment.findMany({
      where: { user_id: userId },
      orderBy: { id: 'desc' },
    });

    const enriched = investments.map(enrichInvestment);

    return res.status(200).json({ success: true, investments: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /investments/admin - Admin: list all users' savings accounts
const getAdminAllInvestments = async (req, res) => {
  try {
    const investments = await prisma.investment.findMany({
      orderBy: { id: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    const enriched = investments.map(enrichInvestment);

    return res.status(200).json({ success: true, investments: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /investments - Open a new savings/investment account
const createInvestment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, term_months } = req.body;

    const principal = Number(amount);
    if (isNaN(principal) || principal < 50000) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is 50,000 ₫' });
    }

    // Determine interest rate based on term
    // Flexible = 0.2%, 1 month = 5.0%, 3 months = 5.8%, 6 months = 7.6%, 12 months = 9.4%, 24 months = 9.8%
    let interestRate = 0.20;
    if (term_months === 1) interestRate = 5.00;
    else if (term_months === 3) interestRate = 5.80;
    else if (term_months === 6) interestRate = 7.60;
    else if (term_months === 12) interestRate = 9.40;
    else if (term_months === 24) interestRate = 9.80;

    // Fetch user wallet
    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.status === 'FROZEN') {
      return res.status(403).json({ success: false, message: 'Your wallet is frozen' });
    }

    const available = Number(wallet.balance) - Number(wallet.locked_balance);
    if (available < principal) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Calculate end date for fixed terms
    let endDate = null;
    if (term_months > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + term_months);
      endDate = d;
    }

    // Lock funds for savings — do not also decrement balance (that double-counts in available = balance - locked)
    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { user_id: userId },
        data: {
          locked_balance: { increment: principal },
        },
      });

      // 2. Create investment record
      const investment = await tx.investment.create({
        data: {
          user_id: userId,
          amount: principal,
          term_months,
          interest_rate: interestRate,
          end_date: endDate,
          status: 'ACTIVE',
        },
      });

      // 3. Log a ledger & transaction
      const transaction = await tx.transaction.create({
        data: {
          transaction_type: 'TRANSFER',
          amount: principal,
          final_amount: principal,
          payment_method: 'WALLET',
          status: 'SUCCESS',
          sender_wallet_id: wallet.id,
          message: `Opened savings account #SWINV-${investment.id} (Term: ${term_months === 0 ? 'Flexible' : term_months + 'M'})`,
        },
      });

      const availableBefore = Number(wallet.balance) - Number(wallet.locked_balance);
      const availableAfter = availableBefore - principal;

      await tx.ledgerEntry.create({
        data: {
          transaction_id: transaction.id,
          wallet_id: wallet.id,
          type: 'DEBIT',
          amount: principal,
          balance_before: availableBefore,
          balance_after: availableAfter,
        },
      });

      return { investment, wallet: updatedWallet };
    });

    return res.status(200).json({
      success: true,
      message: 'Savings account opened successfully',
      investment: result.investment,
      wallet: result.wallet,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /investments/:id/withdraw - Close/withdraw savings
const withdrawInvestment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const invId = Number(req.params.id);

    const investment = await prisma.investment.findFirst({
      where: { id: invId, user_id: userId },
    });

    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment account not found' });
    }

    if (investment.status === 'WITHDRAWN') {
      return res.status(400).json({ success: false, message: 'This savings account is already closed' });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.status === 'FROZEN') {
      return res.status(403).json({ success: false, message: 'Your wallet is frozen' });
    }

    const startDate = new Date(investment.start_date);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - startDate.getTime());
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const amount = Number(investment.amount);
    let interest = 0;
    let isEarly = false;

    if (investment.term_months === 0) {
      // Flexible term: standard daily interest
      const rate = Number(investment.interest_rate) / 100;
      interest = amount * rate * (daysPassed / 365);
    } else {
      const endDate = new Date(investment.end_date);
      if (now < endDate) {
        // Early withdrawal penalty: flexible interest rate (0.2%)
        isEarly = true;
        const flexibleRate = 0.002;
        interest = amount * flexibleRate * (daysPassed / 365);
      } else {
        // Matured
        const rate = Number(investment.interest_rate) / 100;
        interest = amount * rate * (investment.term_months / 12);
      }
    }

    const roundedInterest = Math.round(interest);
    const totalPayout = amount + roundedInterest;

    // Release lock and credit earned interest (principal stays in balance; only locked portion moves)
    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { user_id: userId },
        data: {
          balance: { increment: roundedInterest },
          locked_balance: { decrement: amount },
        },
      });

      // 2. Close investment
      const updatedInv = await tx.investment.update({
        where: { id: invId },
        data: {
          status: 'WITHDRAWN',
          accumulated_interest: roundedInterest,
          withdrawn_at: now,
          payout_amount: totalPayout,
        },
      });

      // 3. Log ledger & transaction
      const transaction = await tx.transaction.create({
        data: {
          transaction_type: 'DEPOSIT',
          amount: totalPayout,
          final_amount: totalPayout,
          payment_method: 'WALLET',
          status: 'SUCCESS',
          receiver_wallet_id: wallet.id,
          message: `Withdrew savings account #SWINV-${invId} (${isEarly ? 'Early Withdrawal' : 'Matured'})`,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transaction_id: transaction.id,
          wallet_id: wallet.id,
          type: 'CREDIT',
          amount: totalPayout,
          balance_before: wallet.balance,
          balance_after: updatedWallet.balance,
        },
      });

      return { investment: updatedInv, payout: totalPayout, wallet: updatedWallet };
    });

    return res.status(200).json({
      success: true,
      message: 'Savings withdrawn successfully',
      payout: result.payout,
      investment: result.investment,
      wallet: result.wallet,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllInvestments,
  getAdminAllInvestments,
  createInvestment,
  withdrawInvestment,
};
