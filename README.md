# Smart Wallet

Monorepo for the SmartWallet digital wallet application: a React frontend and a Node.js/Express backend with MySQL.

## Project structure

```
smart-wallet/
├── blackred-wallet/   # Frontend (React + Vite)
└── wallet-backend/    # Backend (Express + Prisma + MySQL)
```

| App | Stack | Default port |
|-----|-------|--------------|
| `blackred-wallet` | React 19, Vite 6, Tailwind CSS 4, Axios | `3000` |
| `wallet-backend` | Express 5, Prisma 5, JWT, MySQL | `5000` |

## Prerequisites

- Node.js 18+
- MySQL (e.g. XAMPP or local MySQL server)
- Gmail account (for OTP emails in development)

## Getting started

### 1. Backend

```bash
cd wallet-backend
npm install
```

Create `wallet-backend/.env`:

```env
DATABASE_URL="mysql://root@localhost:3306/wallet_db"
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
PORT=5000
```

Run migrations and start the server:

```bash
npx prisma migrate deploy
npm run dev
```

Optional: create an admin user:

```bash
node src/createAdmin.js
```

Default admin: `admin@gmail.com` / `admin@12345678`

### 2. Frontend

```bash
cd blackred-wallet
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: point the frontend at a deployed API:

```env
# blackred-wallet/.env
VITE_API_URL=http://localhost:5000/api
```

## API overview

Backend base URL: `http://localhost:5000/api`

| Route prefix | Purpose |
|--------------|---------|
| `/auth` | Register, login, OTP, password reset, refresh token |
| `/kyc` | KYC submission and verification |
| `/users` | Profile, avatar, password, contact changes |
| `/wallet` | Balance stats, transactions, deposit, transfer |
| `/banks` | Link and manage bank accounts |
| `/admin` | User management, ban/unban, wallet freeze |

## Scripts

**Frontend (`blackred-wallet`):**

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — ESLint

**Backend (`wallet-backend`):**

- `npm run dev` — nodemon dev server
- `npm run lint` — ESLint
- `npm run lint:fix` — ESLint with auto-fix

## Notes

- Do not commit `.env` files or `node_modules/` — they are listed in `.gitignore`.
- Uploaded KYC images and avatars are stored under `wallet-backend/uploads/` (ignored by git).
- Frontend session tokens are stored in browser `localStorage` (`bw_token`, `bw_admin_token`, etc.).

## License

ISC (backend package). Frontend is private.
