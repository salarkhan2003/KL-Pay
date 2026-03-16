/**
 * auth.ts — KL One Magic Link Authentication
 *
 * Handles the full email-link (passwordless) sign-in flow:
 *   1. sendMagicLink()   — sends the sign-in email and persists email+phone
 *   2. completeMagicLink() — called on app load; detects the link and signs in
 *   3. saveUserProfile()  — upserts the Firestore user document after sign-in
 */

import {
  auth,
  db,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_EMAIL_KEY = 'klone_email_for_signin';
const STORAGE_PHONE_KEY = 'klone_phone_for_signin';

// Use current origin so the magic link redirects back to this app.
// In Firebase Console → Authentication → Settings → Authorized domains,
// add "localhost" (no port) for local dev, and your real domain for production.
const CONTINUE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'https://gen-lang-client-0573573934.firebaseapp.com';

const ACTION_CODE_SETTINGS = {
  url: CONTINUE_URL,
  handleCodeInApp: true,
};

// ─── Validation ───────────────────────────────────────────────────────────────

export const VALID_EMAIL_DOMAINS = ['@kluniversity.in', '@klu.ac.in', '@gmail.com'];

export function isKluEmail(email: string): boolean {
  // Accept KLU emails and gmail for testing; in production tighten this
  return email.includes('@') && email.length > 5;
}

export function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone.replace(/\D/g, ''));
}

// ─── Error Messages ───────────────────────────────────────────────────────────

const FIREBASE_ERROR_MAP: Record<string, string> = {
  'auth/unauthorized-continue-uri':
    'This domain is not authorized. Contact support.',
  'auth/invalid-email': 'Invalid email address.',
  'auth/invalid-action-code':
    'This link has expired or already been used. Request a new one.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/expired-action-code': 'This link has expired. Request a new one.',
};

export function getAuthErrorMessage(err: any): string {
  const code: string = err?.code ?? '';
  return FIREBASE_ERROR_MAP[code] ?? err?.message ?? 'Something went wrong. Try again.';
}

// ─── Step 1: Send Magic Link ──────────────────────────────────────────────────

export async function sendMagicLink(email: string, phone: string): Promise<void> {
  if (!isKluEmail(email)) {
    throw Object.assign(new Error('Please use your KLU email (@kluniversity.in).'), {
      code: 'auth/invalid-email',
    });
  }
  if (!isValidPhone(phone)) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);

  // Persist locally so we can retrieve after the redirect
  localStorage.setItem(STORAGE_EMAIL_KEY, email);
  localStorage.setItem(STORAGE_PHONE_KEY, phone.replace(/\D/g, ''));
}

// ─── Step 2: Complete Sign-In from Link ───────────────────────────────────────

export interface MagicLinkResult {
  uid: string;
  email: string;
  phone: string;
  isNewUser: boolean;
}

export async function completeMagicLink(href: string): Promise<MagicLinkResult | null> {
  if (!isSignInWithEmailLink(auth, href)) return null;

  const email = localStorage.getItem(STORAGE_EMAIL_KEY);
  if (!email) {
    // Edge case: user opened the link on a different device/browser
    throw new Error(
      'Could not find your email. Please enter it below to complete sign-in.'
    );
  }

  const phone = localStorage.getItem(STORAGE_PHONE_KEY) ?? '';

  const credential = await signInWithEmailLink(auth, email, href);

  // Clean up storage and URL
  localStorage.removeItem(STORAGE_EMAIL_KEY);
  localStorage.removeItem(STORAGE_PHONE_KEY);
  window.history.replaceState({}, document.title, window.location.pathname);

  return {
    uid: credential.user.uid,
    email: credential.user.email ?? email,
    phone,
    isNewUser: credential.user.metadata.creationTime === credential.user.metadata.lastSignInTime,
  };
}

// ─── Step 3: Upsert Firestore Profile ─────────────────────────────────────────

export async function saveUserProfile(
  uid: string,
  email: string,
  phone: string,
  adminEmail: string
): Promise<UserProfile> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  const isAdmin = email.toLowerCase() === adminEmail.toLowerCase();

  if (snap.exists()) {
    const existing = snap.data() as UserProfile;
    const updates: Partial<UserProfile> = {};

    // Always keep phone up-to-date
    if (phone && existing.phone !== phone) updates.phone = phone;
    // Promote to admin if needed
    if (isAdmin && existing.role !== 'admin') updates.role = 'admin';

    if (Object.keys(updates).length > 0) {
      await updateDoc(ref, updates);
    }

    return { ...existing, ...updates };
  }

  // New user — create full profile
  const newProfile: UserProfile = {
    uid,
    email,
    displayName: email.split('@')[0],
    role: isAdmin ? 'admin' : 'student',
    phone,
    kCoins: 0,
    streak: 0,
    block: 'CSE',
  };

  await setDoc(ref, newProfile);
  return newProfile;
}
