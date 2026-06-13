require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const kycRoutes = require('./routes/kyc.routes');
const adminRoutes = require('./routes/admin.routes');
const userSettingRoutes = require('./routes/user.settings.routes');
const bankManageRoutes = require('./routes/bank.routes');
const walletManageRoutes = require('./routes/wallet.routes');

const express = require('express');
const cors = require('cors');

//khoi tao app
const app = express();

app.use(cors());

//middle ware de parse du lieu tu form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
