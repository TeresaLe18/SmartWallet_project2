const prisma = require('../prisma/prisma');
const walletService = require('./walletService');
const ledgerService = require('./ledgerService');

class TransactionService {
  constructor() {
    this.prisma = prisma;
    this.walletService = walletService;
    this.ledgerService = ledgerService;
  }

  // ===== DEPOSIT =====

  // ===== TRANSFER =====
  async transfer(fromUserId, toUserId, amount) {
    if (amount <= 0) {
      throw new Error('Invalid amount');
    }

    return await this.prisma.$transaction(async (tx) => {
      const fromWallet = await tx.wallet.findUnique({
        where: { user_id: fromUserId },
      });

      const toWallet = await tx.wallet.findUnique({
        where: { user_id: toUserId },
      });

      if (!fromWallet || !toWallet) {
        throw new Error('Wallet not found');
      }

      if (fromWallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      const transaction = await tx.transaction.create({
        data: {
          transaction_type: 'TRANSFER',
          amount,
          final_amount: amount,
          payment_method: 'WALLET',
          sender_wallet_id: fromWallet.id,
          receiver_wallet_id: toWallet.id,
          status: 'SUCCESS',
        },
      });

      await tx.wallet.update({
        where: { id: fromWallet.id },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      await tx.wallet.update({
        where: { id: toWallet.id },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      await this.ledgerService.debit(
        tx,
        transaction.id,
        fromWallet.id,
        amount,
        fromWallet.balance,
        fromWallet.balance - amount,
      );

      await this.ledgerService.credit(
        tx,
        transaction.id,
        toWallet.id,
        amount,
        toWallet.balance,
        toWallet.balance + amount,
      );

      return transaction;
    });
  }

  // ===== WITHDRAW =====

  // ===== PAYMENT =====
}

module.exports = new TransactionService();
