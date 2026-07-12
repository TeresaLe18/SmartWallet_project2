# SmartWallet

SmartWallet is a digital e-wallet system for everyday money management — deposit, withdraw, transfer, bank payment, savings, KYC, and admin controls.

The project is a monorepo with:

- **`wallet-frontend`** — React 19 + Vite 6 user & admin UI
- **`wallet-backend`** — Express 5 + Prisma ORM + MySQL API

---

===========LIVE DEMO===========
Frontend: https://your-project.vercel.app

## Deployment
- Frontend: Vercel
- Backend: Render
- Database: Railway (MySQL)

## Demo Note
The backend is hosted on Render's free tier and may take up to 30-60 seconds to wake up on the first request.

## Demo Account
Admin:
Email: admin@gmail.com
Password: admin@12345678

===========END LIVE DEMO===========


## Project structure

```
smart-wallet/
├── wallet-frontend/   # React frontend (port 3000)
├── wallet-backend/    # Express API (port 5000)
└── README.md
```

---

## Tech stack

| Layer | Stack | Default port |
|---|---|---|
| **Frontend** | React 19, Vite 6, Tailwind CSS, Framer Motion, Lucide, Axios, Recharts | `3000` |
| **Backend** | Express 5, Prisma, MySQL, JWT, Bcrypt, Multer, Nodemailer, PayOS | `5000` |

---

## Main features

### User wallet
- **Deposit** — from a linked bank account, or via PayOS QR payment
- **Withdraw** — to a linked bank account (requires 4-digit transaction PIN)
- **Transfer (SmartWallet)** — wallet-to-wallet by email/phone, with optional voucher
- **Bank payment** — send money to an external bank account (`POST /wallet/payment`)
- **Bank linking** — link up to 3 bank accounts
- **KYC** — upload ID card (front/back) + selfie for verification
- **Wallet freeze** — user can freeze their wallet; admin can unfreeze
- **Notifications** — deposit, withdraw, transfer, KYC status updates
- **Savings / investment** — savings vaults and accumulation options
- **Offers & vouchers** — promo codes for eligible transfers
- **Light/dark theme** and **VI/EN** language switch

### Admin panel
- User management (lock/unlock, freeze/unfreeze wallet)
- KYC review (approve / reject)
- Transaction and fraud log review
- Fees, categories, vouchers, news, support, investment oversight

---

## Prerequisites

- Node.js **18+**
- MySQL running locally (e.g. XAMPP, Laragon, or MySQL on port `3306`)

---

## Getting started

### 1. Backend

```bash
cd wallet-backend
npm install
```

Create `wallet-backend/.env`:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/wallet_db"
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_gmail_app_password
PORT=5000
FRONTEND_URL=http://localhost:3000
```

Optional PayOS keys (for QR deposit):

```env
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
```

Sync the database schema:

```bash
npx prisma db push
# or, if you prefer migrations:
# npx prisma migrate dev
```

Seed sample data (optional):

```bash
node src/seedUsers.js
node src/seedKyc.js
node src/seedDemo.js
node src/seedNews.js
```

Create an admin account (if needed):

```bash
node src/createAdmin.js
```

Start the API:

```bash
npm run dev
```

Backend runs at: **http://localhost:5000**

---

### 2. Frontend

```bash
cd wallet-frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## Demo accounts

Password rule (seeded users): `<email-local-part>@123456`

| Email | Role | Notes |
|---|---|---|
| `admin@gmail.com` / `admin@smartwallet.com` | `ADMIN` | Created via `createAdmin.js` or seed |
| Seeded user emails (see `seedUsers.js`) | `USER` | Some may be KYC-verified |

> Exact seed emails and balances depend on your seed scripts. Prefer checking `wallet-backend/src/seedUsers.js` and `createAdmin.js` after seeding.

---

## Useful API groups

| Prefix | Purpose |
|---|---|
| `/api/auth` | Register, login, OTP, PIN, notifications |
| `/api/users` | Profile, password, disable account, freeze wallet |
| `/api/wallet` | Stats, transactions, deposit, withdraw, transfer, payment |
| `/api/banks` | Link / unlink bank accounts |
| `/api/kyc` | Submit / update KYC |
| `/api/admin` | Users, KYC review, wallets, fraud logs |
| `/api/payos` | Create / verify PayOS payment links |
| `/api/vouchers` | Public & admin voucher APIs |
| `/api/statistics` | Spending / dashboard statistics |

---

## Scripts

**Backend (`wallet-backend`)**

```bash
npm run dev      # nodemon
npm start        # production
npx prisma studio
```

**Frontend (`wallet-frontend`)**

```bash
npm run dev
npm run build
npm run preview
```

---

## Notes

- Uploaded images (avatar, KYC) are stored under `wallet-backend/uploads/` and served as static files.
- Sensitive wallet actions (withdraw, transfer, payment) require a verified transaction PIN.
- KYC must be **VERIFIED** before deposit, withdraw, transfer, and bank payment.
- locked accounts cannot log in until an admin reactivates or unlocks them.
