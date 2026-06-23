const prisma = require('./config/prisma');
const bcrypt = require('bcrypt');

async function createCustomUser() {
  const email = 'rajpham@gmail.com';
  const password = 'raj@123456';
  const balance = 100000000; // 100,000,000 VND default balance

  try {
    const hash = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { password: hash },
      });
      console.log(`Updated existing user: ${email} with password: ${password}`);
    } else {
      const user = await prisma.user.create({
        data: {
          email,
          password: hash,
          role: 'USER',
          wallet: {
            create: {
              balance,
            },
          },
        },
      });
      console.log(`Created new user: ${email} (ID: ${user.id}) with password: ${password}`);
      
      // Auto-verify KYC for this user so they can transact immediately
      await prisma.userKyc.upsert({
        where: { user_id: user.id },
        update: { status: 'VERIFIED' },
        create: {
          user_id: user.id,
          national_id: '079200099999',
          full_name: 'Raj Pham',
          date_of_birth: new Date('1995-01-01'),
          gender: 'Nam',
          address: 'Hồ Chí Minh, Việt Nam',
          front_image: 'seed-kyc-front.jpg',
          back_image: 'seed-kyc-back.jpg',
          selfie_image: 'seed-kyc-selfie.jpg',
          status: 'VERIFIED',
        },
      });
      console.log(`Verified KYC for: ${email}`);
    }
  } catch (error) {
    console.error('Error creating user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createCustomUser();
