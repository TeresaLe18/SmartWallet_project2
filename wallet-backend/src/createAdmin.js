const prisma = require('./config/prisma');
const bcrypt = require('bcrypt');

async function createAdmin() {
    const email = 'admin@gmail.com';
    const password = 'admin@12345678';

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data: {
            email,
            password: hash,
            role: 'ADMIN', 
        }
    });

    console.log('Admin created');
}

createAdmin();