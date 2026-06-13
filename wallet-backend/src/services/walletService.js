const prisma = require('../prisma/prisma');

class WalletService {
  constructor() {
    this.prisma = prisma;
  }

  async getWalletByUserId(userId) {
    return await this.prisma.wallet.findUnique({
      where: { user_id: userId },
    });
  }

  async getWalletById(walletId) {
    return await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
  }

  async getBalance(walletId) {
    const wallet = await this.getWalletById(walletId);
    if (!wallet) throw new Error('Wallet not found');
    return wallet.balance;
  }

  async freezeWallet(walletId) {
    return await this.prisma.wallet.update({
      where: { id: walletId },
      data: { status: 'FROZEN' },
    });
  }

  async unfreezeWallet(walletId) {
    return await this.prisma.wallet.update({
      where: { id: walletId },
      data: { status: 'ACTIVE' },
    });
  }

  async updateBalance(walletId, newBalance) {
    return await this.prisma.wallet.update({
      where: { id: walletId },
      data: { balance: newBalance },
    });
  }
}

module.exports = new WalletService();
