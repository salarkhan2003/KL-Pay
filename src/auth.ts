/**
 * auth.ts — KL One Authentication via Supabase
 *
 * Uses Supabase magic link (OTP email) for passwordless sign-in.
 * Profile data is stored in Supabase `profiles` table AND Firestore (for real-time).
 */

import { supabase, upsertProfile, extractStudentId } from './supabase';
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from './types';

// ─── Validation ───────────────────────────────────────────────────────────────

export function isKluEmail(email: string): boolean {
  return email.includes('@') && email.length > 5;
}

export function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone.replace(/\D/g, ''));
}

// ─── Error Messages ───────────────────────────────────────────────────────────

export function getAuthErrorMessage(err: any): string {
  const msg: string = err?.message ?? '';
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (msg.includes('Email not confirmed')) return 'Check your email for the magic link.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait and try again.';
  if (msg.includes('network')) return 'Network error. Check your connection.';
  return msg || 'Something went wrong. Try again.';
}

// ─── Step 1: Send Magic Link (Supabase OTP) ───────────────────────────────────

export async function sendMagicLink(email: string, phone: string): Promise<void> {
  if (!isKluEmail(email)) throw new Error('Please enter a valid email address.');
  if (!isValidPhone(phone)) throw new Error('Please enter a valid 10-digit mobile number.');

  // Store phone for after redirect
  localStorage.setItem('klone_phone', phone.replace(/\D/g, ''));

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

// ─── Step 2: Check session on load (Supabase handles redirect) ────────────────

export interface MagicLinkResult {
  uid: string;
  email: string;
  phone: string;
  isNewUser: boolean;
}

export async function checkSession(): Promise<MagicLinkResult | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const u = session.user;
  const phone = localStorage.getItem('klone_phone') || u.user_metadata?.phone || '';
  localStorage.removeItem('klone_phone');

  // Determine if new user by checking if profile exists in Firestore
  const snap = await getDoc(doc(db, 'users', u.id)).catch(() => null);
  const isNewUser = !snap?.exists();

  return { uid: u.id, email: u.email || '', phone, isNewUser };
}

// ─── Profile Extras (collected during signup) ─────────────────────────────────

export interface ProfileExtras {
  displayName?: string;
  studentId?: string;
  gender?: 'male' | 'female' | 'other';
  hostel?: string;
}

// ─── Step 3: Save / Upsert Profile (Firestore + Supabase) ────────────────────

export async function saveUserProfile(
  uid: string,
  email: string,
  phone: string,
  adminEmail: string,
  extras: ProfileExtras = {}
): Promise<UserProfile> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref).catch(() => null);
  const isAdmin = email.toLowerCase() === adminEmail.toLowerCase();
  const studentId = extras.studentId || extractStudentId(email) || undefined;

  if (snap?.exists()) {
    const existing = snap.data() as UserProfile;
    const updates: Partial<UserProfile> = {};
    if (phone && existing.phone !== phone) updates.phone = phone;
    if (isAdmin && existing.role !== 'admin') updates.role = 'admin';
    if (extras.displayName && !existing.displayName) updates.displayName = extras.displayName;
    if (studentId && !existing.studentId) updates.studentId = studentId;
    if (extras.gender && !existing.gender) updates.gender = extras.gender;
    if (extras.hostel && !existing.hostel) updates.hostel = extras.hostel;

    if (Object.keys(updates).length > 0) {
      await updateDoc(ref, updates).catch(console.warn);
    }
    const merged = { ...existing, ...updates };
    await syncToSupabase(merged);
    return merged;
  }

  const newProfile: UserProfile = {
    uid,
    email,
    displayName: extras.displayName || email.split('@')[0],
    role: isAdmin ? 'admin' : 'student',
    phone,
    kCoins: 0,
    streak: 0,
    block: 'CSE',
    studentId,
    gender: extras.gender,
    hostel: extras.hostel,
  };

  await setDoc(ref, { ...newProfile, createdAt: serverTimestamp() }).catch(console.warn);
  await syncToSupabase(newProfile);
  return newProfile;
}

// ─── Sync profile to Supabase ─────────────────────────────────────────────────

async function syncToSupabase(profile: UserProfile): Promise<void> {
  await upsertProfile({
    id: profile.uid,
    email: profile.email,
    display_name: profile.displayName,
    role: profile.role,
    phone: profile.phone || null,
    student_id: profile.studentId || null,
    gender: profile.gender || null,
    hostel: profile.hostel || null,
    k_coins: profile.kCoins ?? 0,
    streak: profile.streak ?? 0,
    block: profile.block || 'CSE',
    merchant_outlet_id: profile.merchantOutletId || null,
  });
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

// ─── Merchant login via unique code ──────────────────────────────────────────

const MERCHANT_CODES: Record<string, string> = {
  'FRIENDS2024': 'friends-canteen',
  'TESTCANTEEN': 'test-canteen',
};

export function getMerchantOutletByCode(code: string): string | null {
  return MERCHANT_CODES[code.toUpperCase()] || null;
}
