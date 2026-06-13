class LedgerService {
  async credit(
    tx,
    transactionId,
    walletId,
    amount,
    balanceBefore,
    balanceAfter,
  ) {
    return await tx.ledgerEntry.create({
      data: {
        transaction_id: transactionId,
        wallet_id: walletId,
        type: 'CREDIT',
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
      },
    });
  }

  async debit(
    tx,
    transactionId,
    walletId,
    amount,
    balanceBefore,
    balanceAfter,
  ) {
    return await tx.ledgerEntry.create({
      data: {
        transaction_id: transactionId,
        wallet_id: walletId,
        type: 'DEBIT',
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
      },
    });
  }
}

module.exports = new LedgerService();
