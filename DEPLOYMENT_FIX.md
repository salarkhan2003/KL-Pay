# 🔧 KL-Pay Deployment Fix Guide

## Problem
Payments are processing but K-Coins aren't updating and transactions aren't showing in the app.

**Error:** `permission denied for table profiles`

## Root Cause
The webhook is using the anon key instead of the service role key, which doesn't have permission to update the profiles table.

---

## ✅ Solution: Add Service Role Key to Vercel

### Step 1: Get Your Service Role Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `hnezkwnefmjvbdwlyubj`
3. Go to **Project Settings** → **API**
4. Copy the `service_role` key (NOT the anon key)

### Step 2: Add to Vercel Environment Variables
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `kl-one`
3. Go to **Settings** → **Environment Variables**
4. Add this variable:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** `[paste your service_role key here]`
   - **Environment:** Production, Preview, Development (check all)
5. Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

---

## 🧪 Testing After Fix

### Test Payment Flow:
1. Open your app: https://kl-one-rho.vercel.app
2. Login as a student
3. Order from "Test Canteen" (Rs.1 chocolate)
4. Complete payment
5. Check:
   - ✅ Order appears in "Orders" tab
   - ✅ Transaction appears in "Transactions" tab
   - ✅ K-Coins balance increases by 5
   - ✅ Receipt email sent (if Courier configured)

### Check Logs:
Go to Vercel → Logs and look for:
- ✅ `✓ Payment SUCCESS - Processing order:`
- ✅ `📦 Order update: ✓ OK`
- ✅ `💳 Transaction update: ✓ OK`
- ✅ `Awarded 5 K-Coins to [userId], new total: [amount]`
- ✅ `📧 Receipt sent to: [email]`

---

## 🔐 Security Note
The service role key bypasses Row Level Security (RLS) and should ONLY be used in secure server-side code like webhooks. Never expose it in frontend code or commit it to git.

---

## 📋 Additional Environment Variables Needed

Make sure these are also set in Vercel:

```
SUPABASE_URL=https://hnezkwnefmjvbdwlyubj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your service role key]
CASHFREE_APP_ID=[your cashfree app id]
CASHFREE_SECRET_KEY=[your cashfree secret key]
ADMIN_VPA=salarkhan@okaxis
APP_URL=https://kl-one-rho.vercel.app
COURIER_AUTH_TOKEN=[optional - for email receipts]
```

---

## 🎯 What Was Fixed

1. **Webhook authentication**: Now properly uses service role key with fallback error logging
2. **Better logging**: Added emoji indicators for easier debugging in Vercel logs
3. **Environment setup**: Updated .env with proper variable names
4. **Error handling**: Webhook now logs clear errors when service key is missing

---

## 🚨 If Still Not Working

1. Check Vercel logs for the error message about missing service key
2. Verify the service role key is correct (copy it again from Supabase)
3. Make sure you redeployed after adding the environment variable
4. Check that RLS policies allow updates (they should with service role key)
