const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { clearRefreshTokenCookie } = require('../utils/authCookie');
const { buildOtpEmail, getEmailFrom } = require('../utils/otpEmailTemplate');

const otpStore = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// GET /users/me — returns full profile for authenticated user
const getMe = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phone: true,
                avatar: true,
                role: true,
                status: true,
                pin_hash: true,
                pin_locked_until: true,
                kyc: { select: { status: true, full_name: true, national_id: true } },
                wallet: { select: { status: true } },
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                phone: user.phone || null,
                avatar: user.avatar || null,
                role: user.role,
                status: user.status,
                has_pin: !!user.pin_hash,
                pin_locked_until: user.pin_locked_until,
                kyc_status: user.kyc?.status || null,
                full_name: user.kyc?.full_name || null,
                wallet_status: user.wallet?.status || 'ACTIVE',
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /users/profile/:id — kept for internal use (queries by numeric user id)
const getProfile = async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user id' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true, email: true, phone: true },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
        });
    }
};

// REQUEST CHANGE CONTACT
// Accepts: { email } to change email only, { phone } to change phone only, or both.
// Also accepts legacy field names newEmail / newPhone for backwards compat.
const requestChangeContact = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Accept both old (newEmail/newPhone) and new (email/phone) field names
        const rawEmail = req.body.email ?? req.body.newEmail;
        const rawPhone = req.body.phone ?? req.body.newPhone;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Normalise — only keep fields that are actually provided and different
        const newEmail = rawEmail ? rawEmail.toLowerCase().trim() : null;
        const newPhone = rawPhone ? rawPhone.trim() : null;

        if (!newEmail && !newPhone) {
            return res.status(400).json({ success: false, message: 'Provide at least an email or phone to update' });
        }

        // Must be different from current value
        const emailChanged = newEmail && newEmail !== user.email;
        const phoneChanged = newPhone && newPhone !== (user.phone || '');

        if (!emailChanged && !phoneChanged) {
            return res.status(400).json({ success: false, message: 'No changes detected' });
        }

        // Check duplicates only for fields that will actually change
        if (emailChanged) {
            const emailExist = await prisma.user.findUnique({ where: { email: newEmail } });
            if (emailExist && emailExist.id !== userId) {
                return res.status(400).json({ success: false, message: 'Email already in use' });
            }
        }

        if (phoneChanged) {
            const phoneExist = await prisma.user.findUnique({ where: { phone: newPhone } });
            if (phoneExist && phoneExist.id !== userId) {
                return res.status(400).json({ success: false, message: 'Phone number already in use' });
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Only store fields that actually changed
        otpStore[userId] = {
            email: emailChanged ? newEmail : null,
            phone: phoneChanged ? newPhone : null,
            otp,
            expiredAt: Date.now() + 5 * 60 * 1000,
            resendAt: Date.now() + 60 * 1000,
        };

        await transporter.sendMail({
            from: getEmailFrom(),
            to: user.email,
            ...buildOtpEmail({ purpose: 'contact_change', otp }),
        });

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your current email',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// VERIFY CHANGE CONTACT
const verifyChangeContact = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { otp } = req.body;

        const stored = otpStore[userId];

        if (!stored) {
            return res.status(400).json({ success: false, message: 'No pending request found. Please request OTP first.' });
        }

        if (Date.now() > stored.expiredAt) {
            delete otpStore[userId];
            return res.status(400).json({ success: false, message: 'OTP expired' });
        }

        if (stored.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Build update payload — only include fields that were stored
        const updateData = {};
        if (stored.email) updateData.email = stored.email;
        if (stored.phone) updateData.phone = stored.phone;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, email: true, phone: true, avatar: true },
        });

        delete otpStore[userId];

        return res.status(200).json({
            success: true,
            message: 'Contact updated successfully',
            data: {
                email: updatedUser.email,
                phone: updatedUser.phone,
                avatar: updatedUser.avatar,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE AVATAR
const updateAvatar = async (req, res) => {
    try {
        const userId = req.user.userId;
        const avatar = req.file?.filename;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(avatar && { avatar }),
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Avatar updated successfully',
            user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

//CHANGE PASSWORD
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { oldPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different',
            });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Old password is incorrect',
            });
        }

        const hashed = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashed,
                refreshTokenHash: null,
            },
        });

        clearRefreshTokenCookie(res);

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully. Please sign in again.',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

//DISABLED ACCOUNT
const disableAccount = async (req, res) => {
    try {
        const userId = req.user.userId;

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

        if (existingUser.status === 'DISABLED') {
            return res.status(409).json({
                success: false,
                message: 'Account is already disabled',
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { status: 'DISABLED' },
            });

            await tx.wallet.updateMany({
                where: {
                    user_id: userId,
                    status: 'ACTIVE',
                },
                data: {
                    status: 'FROZEN',
                    freeze_reason: 'ACCOUNT_DISABLED',
                },
            });

            return updatedUser;
        });

        return res.status(200).json({
            success: true,
            message: 'Account disabled successfully',
            user: result,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// WALLET FREEZE
const freezeWallet = async (req, res) => {
    try {
        const userId = req.user.userId;

        const wallet = await prisma.wallet.findUnique({
            where: { user_id: userId },
        });

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found',
            });
        }

        if (wallet.status === 'FROZEN') {
            return res.status(200).json({
                success: true,
                message: 'Wallet already frozen',
            });
        }

        const updated = await prisma.wallet.update({
            where: { user_id: userId },
            data: { 
                status: 'FROZEN',
                freeze_reason: 'USER_REQUEST',
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Wallet frozen successfully',
            wallet: updated,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { displayName } = req.body;
        const trimmed = displayName?.trim() || null;

        // display_name column was removed — persist name on KYC record when one exists
        const kyc = await prisma.userKyc.findUnique({ where: { user_id: userId } });
        if (kyc && trimmed) {
            await prisma.userKyc.update({
                where: { user_id: userId },
                data: { full_name: trimmed },
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                display_name: trimmed,
                full_name: trimmed,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getMe,
    getProfile,
    updateAvatar,
    requestChangeContact,
    verifyChangeContact,
    changePassword,
    disableAccount,
    freezeWallet,
    updateProfile,
};
