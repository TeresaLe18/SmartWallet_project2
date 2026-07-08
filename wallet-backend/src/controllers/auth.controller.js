const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
    setRefreshTokenCookie,
    clearRefreshTokenCookie,
    getRefreshTokenFromRequest,
} = require('../utils/authCookie');
const { hashRefreshToken, verifyStoredRefreshToken } = require('../utils/refreshTokenHash');
const { buildOtpEmail, getEmailFrom } = require('../utils/otpEmailTemplate');

const otpStore = {};
const resetPasswordStore = {};
const pinResetOtpStore = {};
const createPinOtpStore = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

//register
const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        // check email exists or not
        const existingUser = await prisma.user.findUnique({
            where: { email: email },
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists',
            });
        }

        // prevent resending otp many times
        const existingOtp = otpStore[email];
        if (existingOtp && Date.now() < existingOtp.resendAt) {
            return res.status(400).json({
                success: false,
                message: 'Please wait before requesting another OTP',
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // create otp
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // send mail
        await transporter.sendMail({
            from: getEmailFrom(),
            to: email,
            ...buildOtpEmail({ purpose: 'register', otp }),
        });

        // save opt temporarily
        otpStore[email] = {
            otp,
            password: hashedPassword,
            expiredAt: Date.now() + 5 * 60 * 1000,
            resendAt: Date.now() + 60 * 1000,
        };

        return res.status(200).json({
            success: true,
            message: 'OTP sent to email',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

//verify otp after confirming to register account
const verifyRegister = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const data = otpStore[email];

        // check whether otp exists or not
        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'OTP not found',
            });
        }

        // check wether otp is expired or not
        if (Date.now() > data.expiredAt) {
            delete otpStore[email];

            return res.status(400).json({
                success: false,
                message: 'OTP expired',
            });
        }

        // check otp is correct or not
        if (data.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
            });
        }

        // create user and wallet
        const user = await prisma.user.create({
            data: {
                email,
                password: data.password,
                wallet: {
                    create: {},
                },
            },
        });

        // delete otp after verifying
        delete otpStore[email];

        return res.status(201).json({
            success: true,
            message: 'Register successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                },
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// resend otp register
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            });
        }

        // check email already registered
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists',
            });
        }

        const data = otpStore[email];

        // user chưa đăng ký trước đó
        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'No OTP request found. Please register again.',
            });
        }

        // chống spam resend
        if (Date.now() < data.resendAt) {
            const seconds = Math.ceil(
                (data.resendAt - Date.now()) / 1000
            );

            return res.status(400).json({
                success: false,
                message: `Please wait ${seconds}s before requesting another OTP`,
            });
        }

        // generate new otp
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // send mail
        await transporter.sendMail({
            from: getEmailFrom(),
            to: email,
            ...buildOtpEmail({ purpose: 'resend_register', otp }),
        });

        // update otp
        otpStore[email] = {
            ...data, // giữ lại password hash
            otp,
            expiredAt: Date.now() + 5 * 60 * 1000,
            resendAt: Date.now() + 60 * 1000,
        };

        return res.status(200).json({
            success: true,
            message: 'New OTP sent successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

//login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // find user with KYC
        const user = await prisma.user.findUnique({
            where: { email },
            include: { kyc: { select: { status: true } } }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (user.status === 'LOCKED') {
            return res.status(403).json({
                success: false,
                message: 'Account is locked. Please contact support for assistance.',
            });
        }

        if (user.status === 'DISABLED') {
            return res.status(403).json({
                success: false,
                message: 'Account is disabled. Please contact support to reactivate your account.',
            });
        }

        // create access token (short-term)
        const accessToken = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // create refresh token (long-term)
        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        // save refresh token hash in DB (plain token only in HttpOnly cookie)
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: hashRefreshToken(refreshToken) }
        });

        setRefreshTokenCookie(res, refreshToken);

        return res.status(200).json({
            success: true,
            data: {
                accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    phone: user.phone || null,
                    status: user.status,
                    kyc_status: user.kyc?.status || null,
                    has_pin: !!user.pin_hash,
                }
            }
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const refreshTokenHandler = async (req, res) => {
    try {
        const refreshToken = getRefreshTokenFromRequest(req);

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'No refresh token'
            });
        }

        // verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // check user
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user || !verifyStoredRefreshToken(refreshToken, user.refreshTokenHash)) {
            clearRefreshTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Issue a new access token only — keep the existing refresh token to avoid
        // invalidating parallel refresh calls (e.g. admin dashboard polling).
        const newAccessToken = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        return res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
            }
        });

    } catch (err) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({
            success: false,
            message: 'Token expired or invalid'
        });
    }
};

//logout — always clear HttpOnly cookie; revoke DB token when access token is still valid
const logout = async (req, res) => {
    try {
        clearRefreshTokenCookie(res);

        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                await prisma.user.update({
                    where: { id: decoded.userId },
                    data: { refreshTokenHash: null },
                });
            } catch (_) {
                // access token expired — cookie is already cleared
            }
        }

        return res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

//forgot password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            });
        }
        const user = await prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found',
            });
        }

        const existingOtp = resetPasswordStore[email];
        if (existingOtp && Date.now() < existingOtp.resendAt) {
            return res.status(400).json({
                success: false,
                message: 'Please wait before requesting another OTP',
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await transporter.sendMail({
            from: getEmailFrom(),
            to: email,
            ...buildOtpEmail({ purpose: 'password_reset', otp }),
        });

        resetPasswordStore[email] = {
            otp,
            expiredAt: Date.now() + 5 * 60 * 1000,
            resendAt: Date.now() + 60 * 1000,
        };

        return res.status(200).json({
            success: true,
            message: 'OTP sent to email',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP and new password are required',
            });
        }
        const data = resetPasswordStore[email];

        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'OTP not found',
            });
        }

        if (Date.now() > data.expiredAt) {
            delete resetPasswordStore[email];

            return res.status(400).json({
                success: false,
                message: 'OTP expired',
            });
        }

        if (data.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                refreshTokenHash: null,
            },
        });

        delete resetPasswordStore[email];

        return res.status(200).json({
            success: true,
            message: 'Password reset successful',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
// Set transaction PIN
// const setPin = async (req, res) => {
//     try {
//         const userId = req.user.userId;
//         const { pin } = req.body;

//         if (!pin || !/^\d{4}$/.test(String(pin))) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'PIN must be exactly 4 digits',
//             });
//         }

//         const pin_hash = await bcrypt.hash(String(pin), 10);

//         await prisma.user.update({
//             where: { id: userId },
//             data: { pin_hash, pin_failed_attempts: 0, pin_locked_until: null },
//         });

//         return res.status(200).json({
//             success: true,
//             message: 'Transaction PIN set successfully',
//         });
//     } catch (error) {
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

// Change transaction PIN
const changePin = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { current_pin, new_pin } = req.body;

        if (!current_pin || !new_pin) {
            return res.status(400).json({
                success: false,
                message: 'Current PIN and new PIN are required',
            });
        }

        if (!/^\d{4}$/.test(String(current_pin))) {
            return res.status(400).json({
                success: false,
                message: 'Current PIN must be exactly 4 digits',
            });
        }

        if (!/^\d{4}$/.test(String(new_pin))) {
            return res.status(400).json({
                success: false,
                message: 'New PIN must be exactly 4 digits',
            });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user?.pin_hash) {
            return res.status(400).json({
                success: false,
                message: 'No PIN set. Please set a transaction PIN first.',
            });
        }

        if (user.pin_locked_until && new Date() < new Date(user.pin_locked_until)) {
            const remaining = Math.ceil(
                (new Date(user.pin_locked_until) - Date.now()) / 1000 / 60,
            );
            return res.status(429).json({
                success: false,
                message: `PIN is locked. Cannot change PIN. Please try again in ${remaining} minute(s).`,
            });
        }

        const isValid = await bcrypt.compare(String(current_pin), user.pin_hash);

        if (!isValid) {
            const attempts = (user.pin_failed_attempts || 0) + 1;
            const lockUntil = attempts >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null;

            await prisma.user.update({
                where: { id: userId },
                data: {
                    pin_failed_attempts: attempts,
                    ...(lockUntil && { pin_locked_until: lockUntil }),
                },
            });

            const remaining = 3 - attempts;
            const msg =
                attempts >= 3
                    ? 'Too many failed PIN attempts. PIN locked for 15 minutes.'
                    : `Invalid current PIN. ${remaining} attempt(s) remaining.`;

            return res.status(400).json({ success: false, message: msg });
        }

        const pin_hash = await bcrypt.hash(String(new_pin), 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                pin_hash,
                pin_failed_attempts: 0,
                pin_locked_until: null,
                pin_changed_at: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Transaction PIN changed successfully',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Forgot PIN — send OTP to registered email (works even when PIN is locked)
const requestForgotPinOtp = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user?.pin_hash) {
            return res.status(400).json({
                success: false,
                message: 'No PIN set. Please set a transaction PIN first.',
            });
        }

        const existing = pinResetOtpStore[userId];
        if (existing && Date.now() < existing.resendAt) {
            const seconds = Math.ceil((existing.resendAt - Date.now()) / 1000);
            return res.status(400).json({
                success: false,
                message: `Please wait ${seconds}s before requesting another OTP`,
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await transporter.sendMail({
            from: getEmailFrom(),
            to: user.email,
            ...buildOtpEmail({ purpose: 'pin_reset', otp }),
        });

        pinResetOtpStore[userId] = {
            otp,
            expiredAt: Date.now() + 5 * 60 * 1000,
            resendAt: Date.now() + 60 * 1000,
        };

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your registered email',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Forgot PIN — verify OTP and set new PIN
const resetPinWithOtp = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { otp, new_pin } = req.body;

        if (!otp || !new_pin) {
            return res.status(400).json({
                success: false,
                message: 'OTP and new PIN are required',
            });
        }

        if (!/^\d{4}$/.test(String(new_pin))) {
            return res.status(400).json({
                success: false,
                message: 'New PIN must be exactly 4 digits',
            });
        }

        const stored = pinResetOtpStore[userId];

        if (!stored) {
            return res.status(400).json({
                success: false,
                message: 'No pending PIN reset request. Please request OTP first.',
            });
        }

        if (Date.now() > stored.expiredAt) {
            delete pinResetOtpStore[userId];
            return res.status(400).json({
                success: false,
                message: 'OTP expired',
            });
        }

        if (stored.otp !== String(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
            });
        }

        delete pinResetOtpStore[userId];

        const pin_hash = await bcrypt.hash(String(new_pin), 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                pin_hash,
                pin_failed_attempts: 0,
                pin_locked_until: null,
                pin_changed_at: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Transaction PIN reset successfully',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Create PIN — send OTP to registered email (user must not have a PIN yet)
const requestCreatePinOtp = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (user?.pin_hash) {
            return res.status(400).json({
                success: false,
                message: 'PIN already set. Use change PIN instead.',
            });
        }

        const existing = createPinOtpStore[userId];
        if (existing && Date.now() < existing.resendAt) {
            const seconds = Math.ceil((existing.resendAt - Date.now()) / 1000);
            return res.status(400).json({
                success: false,
                message: `Please wait ${seconds}s before requesting another OTP`,
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await transporter.sendMail({
            from: getEmailFrom(),
            to: user.email,
            ...buildOtpEmail({ purpose: 'pin_setup', otp }),
        });

        createPinOtpStore[userId] = {
            otp,
            expiredAt: Date.now() + 5 * 60 * 1000,
            resendAt: Date.now() + 60 * 1000,
        };

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your registered email',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Create PIN — verify OTP and save new PIN
const createPinWithOtp = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { otp, new_pin } = req.body;

        if (!otp || !new_pin) {
            return res.status(400).json({
                success: false,
                message: 'OTP and new PIN are required',
            });
        }

        if (!/^\d{4}$/.test(String(new_pin))) {
            return res.status(400).json({
                success: false,
                message: 'PIN must be exactly 4 digits',
            });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (user?.pin_hash) {
            return res.status(400).json({
                success: false,
                message: 'PIN already set. Use change PIN instead.',
            });
        }

        const stored = createPinOtpStore[userId];

        if (!stored) {
            return res.status(400).json({
                success: false,
                message: 'No pending PIN setup request. Please request OTP first.',
            });
        }

        if (Date.now() > stored.expiredAt) {
            delete createPinOtpStore[userId];
            return res.status(400).json({
                success: false,
                message: 'OTP expired',
            });
        }

        if (stored.otp !== String(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
            });
        }

        delete createPinOtpStore[userId];

        const pin_hash = await bcrypt.hash(String(new_pin), 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                pin_hash,
                pin_failed_attempts: 0,
                pin_locked_until: null,
                pin_changed_at: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Transaction PIN created successfully',
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get user notifications
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;

        const notifications = await prisma.notification.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 50,
        });

        return res.status(200).json({ success: true, notifications });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /auth/notifications/:id/read — đánh dấu 1 thông báo đã đọc (lưu DB, đồng bộ đa thiết bị)
const markNotificationRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification id' });
        }
        // updateMany + ownership guard: chỉ sửa thông báo của chính user
        await prisma.notification.updateMany({
            where: { id, user_id: userId },
            data: { is_read: true },
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /auth/notifications/read-all — đánh dấu tất cả thông báo của user đã đọc
const markAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        await prisma.notification.updateMany({
            where: { user_id: userId, is_read: false },
            data: { is_read: true },
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /auth/notifications/:id — xóa 1 thông báo của user
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification id' });
        }
        const result = await prisma.notification.deleteMany({
            where: { id, user_id: userId },
        });
        if (result.count === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        return res.status(200).json({ success: true, message: 'Notification deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    register,
    verifyRegister,
    login,
    forgotPassword,
    resetPassword,
    resendOtp,
    logout,
    refreshTokenHandler,
    changePin,
    requestForgotPinOtp,
    resetPinWithOtp,
    requestCreatePinOtp,
    createPinWithOtp,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
};
