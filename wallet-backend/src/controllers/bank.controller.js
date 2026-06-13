const prisma = require('../config/prisma');

//link bank to wallet
const linkBankAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { bank_code, account_number, account_name } = req.body;

    if (!bank_code || !account_number || !account_name) {
      return res.status(400).json({
        success: false,
        message: 'Bank code, account number and account name are required',
      });
    }
    // get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    // check duplicate bank
    const existing = await prisma.bankAccount.findFirst({
      where: {
        bank_code,
        account_number,
      },
    });

    //check holder's name
    const kyc = await prisma.userKyc.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC not found',
      });
    }

    if (kyc.status !== 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'Your KYC has not been verified yet.',
      });
    }
    const normalize = (str) => str.trim().toUpperCase();

    // Currently verification is based on KYC name matching.
    // In future versions, bank API integration may also validate:
    // - account existence
    // - account status
    // - account holder information
    // before setting is_verified = true.
    const isMatch =
      kyc.full_name && normalize(kyc.full_name) === normalize(account_name);

    if (existing) {
      if (existing.wallet_id !== wallet.id) {
        return res.status(409).json({
          success: false,
          message: 'Bank account already linked by another user',
        });
      }

      if (existing.is_verified === true) {
        return res.status(409).json({
          success: false,
          message: 'Bank account already linked',
        });
      }

      if (isMatch) {
        const updatedBank = await prisma.bankAccount.update({
          where: { id: existing.id },
          data: {
            account_name: account_name,
            is_verified: true,
          },
        });

        return res.status(200).json({
          success: true,
          message: 'Bank linked successfully!',
          bank: updatedBank,
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Account holder name does not match KYC information.',
      });
    }

    if (isMatch) {
      const bank = await prisma.bankAccount.create({
        data: {
          wallet_id: wallet.id,
          bank_code,
          account_number,
          account_name,
          is_verified: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Bank linked successfully!',
        bank,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Account holder name does not match KYC information.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//get banks
const getMyBanks = async (req, res) => {
  try {
    const userId = req.user.userId;

    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    const banks = await prisma.bankAccount.findMany({
      where: {
        wallet_id: wallet.id,
      },
    });

    res.status(200).json(banks);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//unlink bank
const unlinkBank = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    const bank = await prisma.bankAccount.findUnique({
      where: { id: Number(id) },
    });

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found',
      });
    }

    if (bank.wallet_id !== wallet.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to remove this bank account',
      });
    }

    await prisma.bankAccount.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({
      success: true,
      message: 'Bank account removed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = { linkBankAccount, getMyBanks, unlinkBank };
