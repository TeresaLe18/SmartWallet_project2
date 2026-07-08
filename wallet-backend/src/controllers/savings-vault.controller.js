const prisma = require('../config/prisma');

// GET /api/savings-vaults - Get all savings vaults for the user
const getAllVaults = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vaults = await prisma.savingsVault.findMany({
      where: { user_id: userId },
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({ success: true, vaults });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/savings-vaults - Create a new savings vault
const createVault = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, target_amount, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Vault name is required' });
    }

    const target = target_amount ? Number(target_amount) : null;
    if (target !== null && (isNaN(target) || target <= 0)) {
      return res.status(400).json({ success: false, message: 'Invalid target amount' });
    }

    const vault = await prisma.savingsVault.create({
      data: {
        user_id: userId,
        name: name.trim(),
        target_amount: target,
        category: category || 'General',
        current_amount: 0,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Savings vault created successfully',
      vault,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/savings-vaults/:id/deposit - Transfer money from main wallet to savings vault
const depositToVault = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vaultId = Number(req.params.id);
    const { amount } = req.body;

    const depAmount = Number(amount);
    if (isNaN(depAmount) || depAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
    }

    const vault = await prisma.savingsVault.findFirst({
      where: { id: vaultId, user_id: userId },
    });

    if (!vault) {
      return res.status(404).json({ success: false, message: 'Savings vault not found' });
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

    if (Number(wallet.balance) < depAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Perform transaction: decrement wallet balance, increment vault current_amount, log ledger & transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Decrement wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { user_id: userId },
        data: {
          balance: { decrement: depAmount },
        },
      });

      // 2. Increment vault amount
      const updatedVault = await tx.savingsVault.update({
        where: { id: vaultId },
        data: {
          current_amount: { increment: depAmount },
        },
      });

      // 3. Log transaction
      const transaction = await tx.transaction.create({
        data: {
          transaction_type: 'TRANSFER',
          amount: depAmount,
          final_amount: depAmount,
          payment_method: 'WALLET',
          status: 'SUCCESS',
          sender_wallet_id: wallet.id,
          message: `Deposited into Savings Vault: ${vault.name}`,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transaction_id: transaction.id,
          wallet_id: wallet.id,
          type: 'DEBIT',
          amount: depAmount,
          balance_before: wallet.balance,
          balance_after: updatedWallet.balance,
        },
      });

      return { wallet: updatedWallet, vault: updatedVault };
    });

    return res.status(200).json({
      success: true,
      message: `Deposited ${depAmount.toLocaleString('vi-VN')} ₫ into vault successfully`,
      wallet: result.wallet,
      vault: result.vault,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/savings-vaults/:id/withdraw - Transfer money from savings vault back to main wallet
const withdrawFromVault = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vaultId = Number(req.params.id);
    const { amount } = req.body;

    const withdrawAmt = Number(amount);
    if (isNaN(withdrawAmt) || withdrawAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    const vault = await prisma.savingsVault.findFirst({
      where: { id: vaultId, user_id: userId },
    });

    if (!vault) {
      return res.status(404).json({ success: false, message: 'Savings vault not found' });
    }

    if (Number(vault.current_amount) < withdrawAmt) {
      return res.status(400).json({ success: false, message: 'Insufficient vault balance' });
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

    // Perform transaction: increment wallet balance, decrement vault current_amount, log ledger & transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Increment wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { user_id: userId },
        data: {
          balance: { increment: withdrawAmt },
        },
      });

      // 2. Decrement vault amount
      const updatedVault = await tx.savingsVault.update({
        where: { id: vaultId },
        data: {
          current_amount: { decrement: withdrawAmt },
        },
      });

      // 3. Log transaction
      const transaction = await tx.transaction.create({
        data: {
          transaction_type: 'DEPOSIT',
          amount: withdrawAmt,
          final_amount: withdrawAmt,
          payment_method: 'WALLET',
          status: 'SUCCESS',
          receiver_wallet_id: wallet.id,
          message: `Withdrew from Savings Vault: ${vault.name}`,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transaction_id: transaction.id,
          wallet_id: wallet.id,
          type: 'CREDIT',
          amount: withdrawAmt,
          balance_before: wallet.balance,
          balance_after: updatedWallet.balance,
        },
      });

      return { wallet: updatedWallet, vault: updatedVault };
    });

    return res.status(200).json({
      success: true,
      message: `Withdrew ${withdrawAmt.toLocaleString('vi-VN')} ₫ from vault successfully`,
      wallet: result.wallet,
      vault: result.vault,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllVaults,
  createVault,
  depositToVault,
  withdrawFromVault,
};
