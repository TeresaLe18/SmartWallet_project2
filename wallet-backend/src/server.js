require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const kycRoutes = require('./routes/kyc.routes');
const adminRoutes = require('./routes/admin.routes');
const userSettingRoutes = require('./routes/user.settings.routes');
const bankManageRoutes = require('./routes/bank.routes');
const walletManageRoutes = require('./routes/wallet.routes');
const newsRoutes = require('./routes/news.routes');
const payosRoutes = require('./routes/payos.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const chatRoutes = require('./routes/chat.routes');
const feeRoutes = require('./routes/fee.routes');
const categoryRoutes = require('./routes/category.routes');
const voucherRoutes = require('./routes/voucher.routes');
const supportRoutes = require('./routes/support.routes');
const authMiddleware = require('./middlewares/auth.middleware');
const categoryController = require('./controllers/category.controller');
const voucherController = require('./controllers/voucher.controller');

const express = require('express');
const cors = require('cors');

//khoi tao app
const app = express();

app.use(cors());

//middle ware de parse du lieu tu form
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.json({ limit: '25mb' }));

app.get('/', (req, res) => {
  res.send('API running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userSettingRoutes);
app.use('/api/uploads', express.static('uploads'));
app.use('/api/banks', bankManageRoutes);
app.use('/api/wallet', walletManageRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/payos', payosRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/chat', chatRoutes);

// Admin: quản lý phí dịch vụ / voucher / category
app.use('/api/admin/fees', feeRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/vouchers', voucherRoutes);

// Support Chat
app.use('/api/support', supportRoutes);

// User: xem danh sách category, kiểm tra voucher
app.get('/api/categories', authMiddleware, categoryController.listCategories);
app.get('/api/vouchers', voucherController.listActiveVouchers);
app.post('/api/vouchers/check', authMiddleware, voucherController.checkVoucher);

// Map /api/offers for homepage index.jsx
app.get('/api/offers', async (req, res) => {
  try {
    const prisma = require('./config/prisma');
    const now = new Date();
    const all = await prisma.voucher.findMany({
      where: { status: 'ACTIVE', expired_at: { gt: now } },
      orderBy: { id: 'desc' },
    });
    const data = all.filter((v) => v.used_count < v.quantity);
    return res.status(200).json({ success: true, offers: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
