# 🚨 QUICK FIX - K-Coins Not Updating

## The Problem
```
K-Coins update error: permission denied for table profiles
```

## The Solution (2 minutes)

### 1️⃣ Get Service Role Key
- Go to: https://supabase.com/dashboard
- Select project → Settings → API
- Copy the **service_role** key (long key starting with `eyJ...`)

### 2️⃣ Add to Vercel
- Go to: https://vercel.com/dashboard
- Select your project → Settings → Environment Variables
- Add new variable:
  ```
  Name: SUPABASE_SERVICE_ROLE_KEY
  Value: [paste the key you copied]
  Environments: ✓ Production ✓ Preview ✓ Development
  ```
- Click Save

### 3️⃣ Redeploy
- Go to Deployments tab
- Click ⋯ on latest deployment → Redeploy
- Wait ~30 seconds

### 4️⃣ Test
- Visit: https://kl-one-rho.vercel.app/api/debug
- Should see: `✅ All systems operational`
- Make a test order (Rs.1 chocolate from Test Canteen)
- Check K-Coins balance increases by 5

---

## Why This Fixes It

The webhook needs admin-level database access to update K-Coins. The anon key (used by frontend) has Row Level Security restrictions. The service role key bypasses RLS and allows the webhook to update profiles.

**Before:** Webhook → Anon Key → ❌ Permission Denied  
**After:** Webhook → Service Key → ✅ K-Coins Updated

---

## Verify It's Working

Check Vercel logs after a payment. You should see:
```
✓ Payment SUCCESS - Processing order: KLP_...
📦 Order update: ✓ OK
💳 Transaction update: ✓ OK
Awarded 5 K-Coins to [userId], new total: [amount]
📧 Receipt sent to: [email]
```

Instead of:
```
K-Coins update error: permission denied for table profiles
```
