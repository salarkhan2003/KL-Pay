# KL One

> Campus food ordering and payment super app for KL University

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Cashfree](https://img.shields.io/badge/Cashfree-Payments-00B9F1?style=flat-square)](https://cashfree.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)

---

## What is KL One?

KL One is a campus-wide food ordering and payment platform for KL University. Students browse canteens, order food, and pay via UPI. Merchants manage menus and orders in real time. Admins oversee the entire campus ecosystem.

---

## Features

| Feature | Student | Merchant | Admin |
|---|:---:|:---:|:---:|
| Browse campus canteens | ✅ | — | ✅ |
| Order food + UPI checkout | ✅ | — | — |
| Real-time order tracking | ✅ | ✅ | ✅ |
| K-Coins rewards | ✅ | — | — |
| Direct Pay (UPI) | ✅ | — | — |
| Transaction history | ✅ | ✅ | ✅ |
| Manage menu items | — | ✅ | ✅ |
| Manage outlets | — | — | ✅ |
| Accept / reject orders | — | ✅ | — |
| Platform analytics | — | — | ✅ |
| Support tickets | ✅ | — | ✅ |

---

## Tech Stack

- **Frontend** — React 18 + TypeScript + Vite + Tailwind CSS
- **Animations** — Motion (motion/react)
- **Backend** — Vercel Serverless Functions
- **Database** — Firebase Firestore (real-time)
- **Auth** — Firebase Auth (Google + Anonymous/Dev)
- **Payments** — Cashfree Payments (UPI split, platform fee)
- **Hosting** — Vercel

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project
- Cashfree account

### 1. Clone and install

```bash
git clone https://github.com/your-username/KL-One.git
cd KL-One
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```env
# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_ID=your_database_id

# Cashfree
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret
```

### 3. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## Dev Login

KL One has a built-in dev login for testing all roles without email or phone. On the login page, scroll to the bottom and tap **Admin / Dev Login**.

| Role | Access |
|---|---|
| Student | Ordering, K-Coins, cart, history |
| Merchant | Order dashboard, menu management |
| Admin | Full platform control, outlet + menu CRUD |

To change the PIN: open `src/components/LoginPage.tsx` and search for `DEV_PIN`.

---

## Payment Flow

```
Student places order
       |
       v
POST /api/payments/create-session
       |
       v
Cashfree creates order (vendor split + Rs.1 platform fee)
       |
       v
Student completes UPI payment
       |
       v
Cashfree webhook -> POST /api/payments/webhook
       |
       v
Firestore order updated -> Merchant notified
       |
       v
K-Coins awarded to student
```

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "deploy"
git push origin main
```

### 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Set **Root Directory** to `KL-Pay`
4. Add all environment variables from your `.env`
5. Click **Deploy**

### 3. Add your Vercel domain to Firebase Auth

Firebase Console > Authentication > Settings > Authorized Domains > add your `.vercel.app` domain.

---

## Fix: auth/invalid-api-key on Vercel

The `.env` file is gitignored so Vercel never sees it. You must add the env vars manually.

**Vercel Dashboard > Your Project > Settings > Environment Variables**

Add each of these:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_DATABASE_ID
CASHFREE_APP_ID
CASHFREE_SECRET_KEY
CASHFREE_ENV
ADMIN_VPA
APP_URL
```

After adding them, redeploy.

---

## Project Structure

```
KL-Pay/
├── api/
│   ├── _cashfree.ts
│   ├── health.ts
│   └── payments/
│       ├── create-session.ts
│       ├── direct-pay.ts
│       └── webhook.ts
├── src/
│   ├── components/
│   ├── views/
│   ├── App.tsx
│   ├── firebase.ts
│   ├── paymentEngine.ts
│   └── types.ts
├── .env.example
├── firestore.rules
└── vercel.json
```

---

## Firestore Rules

Deploy `firestore.rules` via Firebase Console > Firestore > Rules tab.

---

## Security

- `.env` is gitignored — never commit real API keys
- Cashfree credentials are server-side only (Vercel env vars)
- Firestore rules enforce role-based access
- Dev login uses anonymous Firebase auth

---

## License

MIT — built for KL University.
