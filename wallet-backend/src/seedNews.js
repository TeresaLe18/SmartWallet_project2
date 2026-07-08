// Seed sample English news articles for Admin → Articles (SmartWallet Insights).
// Run: node src/seedNews.js
require('dotenv').config();
const prisma = require('./config/prisma');

// Unsplash images — finance / fintech themed, 800px wide
const IMG = {
  security: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
  cashless: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80',
  aiFinance: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80',
  savings: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
  qrPay: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&auto=format&fit=crop&q=80',
  investment: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
  kyc: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop&q=80',
  market: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=80',
};

/** All fields in English (title/content duplicated in _en for bilingual UI fallback). */
const article = (title, tag, time, image, content) => ({
  title,
  title_en: title,
  tag,
  tag_en: tag,
  time,
  image,
  link: '',
  content,
  content_en: content,
  active: true,
});

const samplePosts = [
  article(
    'SmartWallet upgrades real-time transaction security',
    'Fintech',
    'Just now',
    IMG.security,
    'SmartWallet has rolled out a new security layer that monitors balance changes and transactions as they happen. The system combines JWT authentication, a 4-digit transaction PIN, and instant alerts when unusual activity is detected.\n\n' +
      'Users can transfer, withdraw, and deposit with greater confidence — every action is recorded in a detailed transaction history. Admins can also lock accounts or freeze wallets in emergencies to protect user funds.'
  ),
  article(
    'Cashless boom: e-wallets hit new transaction records',
    'Markets',
    '1 hour ago',
    IMG.cashless,
    'Latest figures show that e-wallet and QR payment volume in Vietnam continues to surge. Users increasingly prefer instant transfers via email or phone number over cash.\n\n' +
      'SmartWallet supports deposits from linked banks, PayOS QR scanning, and wallet-to-wallet transfers in seconds. This trend confirms that digital finance is becoming the default choice for younger consumers.'
  ),
  article(
    'AI in personal finance — the new SmartWallet standard',
    'Technology',
    '3 hours ago',
    IMG.aiFinance,
    'SmartWallet\'s built-in AI financial assistant helps users analyze spending, suggest savings plans, and optimize wallet balance — no manual bookkeeping required.\n\n' +
      'Simply ask: "Analyze my last 10 transactions" or "Suggest a plan to save 10 million VND", and the assistant responds based on your anonymized transaction history. This marks a major step toward personalized, intelligent digital finance.'
  ),
  article(
    'Smart savings vaults: goal-based money management',
    'Investment',
    'Yesterday',
    IMG.savings,
    'SmartWallet lets you create multiple savings vaults — for travel, a new laptop, or small daily budgets — each with a custom name, category, and optional target amount.\n\n' +
      'Deposit from your main wallet, track progress toward your goal, and withdraw anytime. Combined with fixed-term investment accounts, SmartWallet helps you separate everyday spending from long-term financial goals.'
  ),
  article(
    'QR payments & PayOS: faster wallet top-ups than ever',
    'Fintech',
    'Yesterday',
    IMG.qrPay,
    'SmartWallet integrates the PayOS payment gateway (sandbox) so users can top up via bank QR codes. Scan, transfer, and the system automatically checks transaction status.\n\n' +
      'You can also link up to 3 bank accounts for direct deposits and withdrawals. QR payments are quickly becoming the most popular method at stores and online services across Vietnam.'
  ),
  article(
    'KYC & transaction limits: secure identity verification on SmartWallet',
    'Fintech',
    '2 days ago',
    IMG.kyc,
    'To unlock full features and higher transaction limits, SmartWallet users must complete KYC: enter personal details, upload front and back ID card photos, and a selfie.\n\n' +
      'Admins review submissions and update status (Pending / Approved / Rejected). This process follows industry-standard identity verification, protecting both users and the broader e-wallet ecosystem.'
  ),
  article(
    'Investment markets: foreign capital returns to tech stocks',
    'Investment',
    '2 days ago',
    IMG.investment,
    'The stock market is seeing renewed foreign net buying, focused on tech companies and banks with strong digital platforms.\n\n' +
      'In this context, SmartWallet offers fixed-term savings accounts with transparent interest rates — ideal for users who want to earn on idle balance while keeping flexible liquidity.'
  ),
  article(
    'Vietnam\'s digital economy: e-wallet market grows at double-digit pace',
    'Economy',
    '3 days ago',
    IMG.market,
    'Market analysts predict mobile payment volume in Vietnam will maintain double-digit growth over the next five years, driven by digital economy policies and high smartphone adoption.\n\n' +
      'SmartWallet joins this race with fee-discount vouchers, bilingual support (VI/EN), light/dark mode, and a full e-wallet experience — from deposits, withdrawals, and transfers to savings and AI financial advice.'
  ),
];

async function main() {
  console.log('Clearing existing news posts...');
  await prisma.newsPost.deleteMany({});

  const result = await prisma.newsPost.createMany({ data: samplePosts });
  console.log(`✅ Seeded ${result.count} English sample news articles (with images).`);
}

main()
  .catch((err) => {
    console.error('Seed News failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
