<div align="center">
```
██╗  ██╗██╗          ██████╗ ███╗   ██╗███████╗
██║ ██╔╝██║         ██╔═══██╗████╗  ██║██╔════╝
█████╔╝ ██║         ██║   ██║██╔██╗ ██║█████╗  
██╔═██╗ ██║         ██║   ██║██║╚██╗██║██╔══╝  
██║  ██╗███████╗    ╚██████╔╝██║ ╚████║███████╗
╚═╝  ╚═╝╚══════╝     ╚═════╝ ╚═╝  ╚═══╝╚══════╝
```
### KL University Campus Payment Super App
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Cashfree](https://img.shields.io/badge/Cashfree-Payments-00B9F1?style=flat-square)](https://cashfree.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
</div>
---
## What is KL One?
KL One is a campus-wide food ordering and payment platform for KL University. Students browse canteens, order food, and pay via UPI — all in one app. Merchants manage their menus and incoming orders in real time. Admins oversee the entire campus ecosystem.
---
## Features
| Feature | Student | Merchant | Admin |
|---|---|---|---|
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
- **Backend** — Vercel Serverless Functions (TypeScript)
- **Database** — Firebase Firestore (real-time)
- **Auth** — Firebase Auth (Google + Anonymous/Dev)
- **Payments** — Cashfree Payments (UPI split, platform fee)
- **Hosting** — Vercel
---
## Getting Started
### Prerequisites
- Node.js 18+
- A Firebase project
- A Cashfree account (production or sandbox)
### 1. Clone and Install
```bash
git clone https://github.com/your-username/KL One.git
cd KL One
npm install
```
### 2. Configure Environment
Copy .env.example to .env and fill in your values:
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
### 3. Run Locally
```bash
npm run dev
```
App runs at http://localhost:3000
---
## Dev Login (Testing All Roles)
KL One has a built-in dev login for testing without email or phone. On the login page, scroll to the bottom and click **Admin / Dev Login**.
Enter the PIN, then choose a role:
| Role | What you get |
|---|---|
| Student | Full ordering flow, K-Coins, cart, history |
| Merchant | Order dashboard, menu management |
| Admin | Full platform control, outlet + menu CRUD |
> The PIN is stored in src/components/LoginPage.tsx — search for DEV_PIN to update it.
---
## Payment Flow
```
Student places order
        |
        v
POST /api/payments/create-session
        |
        v
Cashfree creates order (split: vendor + Rs.1 platform fee)
        |
        v
Student completes UPI payment
        |
        v
Cashfree webhook -> POST /api/payments/webhook
        |
        v
Firestore order status updated -> Merchant notified
        |
        v
K-Coins awarded to student
```
---
## Deploy to Vercel
### 1. Push to GitHub
```bash
git add .
git commit -m "initial deploy"
git push origin main
```
### 2. Import on Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Set **Root Directory** to KL One
4. Add all environment variables from your .env
5. Click **Deploy**
Vercel auto-detects Vite and the api/ serverless functions. The vercel.json handles all route rewrites.
### 3. Add Vercel Domain to Firebase Auth
In Firebase Console → Authentication → Settings → Authorized Domains, add your .vercel.app domain.
---
## Project Structure
```
KL One/
├── api/                        # Vercel serverless functions
│   ├── _cashfree.ts            # Shared Cashfree setup
│   ├── health.ts               # Health check endpoint
│   └── payments/
│       ├── create-session.ts   # Create Cashfree order
│       ├── direct-pay.ts       # Direct UPI pay
│       └── webhook.ts          # Payment confirmation webhook
├── src/
│   ├── components/             # Shared UI components
│   ├── hooks/
│   ├── views/                  # Full-page views per role
│   ├── App.tsx                 # Root app + all state
│   ├── auth.ts
│   ├── firebase.ts
│   ├── paymentEngine.ts
│   ├── types.ts
│   └── utils.ts
├── .env                        # Local secrets (gitignored)
├── .env.example
├── firestore.rules
├── vercel.json
└── vite.config.ts
```
---
## Firestore Rules
Deploy the rules in firestore.rules via Firebase Console → Firestore → Rules tab. Required for the app to read/write data correctly.
---
## Security Notes
- .env is gitignored — never commit real API keys
- firebase-applet-config.json is gitignored
- Cashfree credentials are server-side only (Vercel env vars, never exposed to client)
- Firestore rules enforce role-based access per collection
- Dev login uses anonymous Firebase auth — safe for testing, not for production users
---
## License
MIT — built for KL University campus use.
---
<div align="center">
  Made with coffee at KL University &nbsp;|&nbsp; KL One v1.0
</div>