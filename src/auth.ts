/**
 * auth.ts — KL One Authentication (Supabase only, no Firebase)
 */

import { supabase, upsertProfile, getProfile, extractStudentId } from './supabase';
import { UserProfile } from './types';

const ADMIN_EMAIL = 'salarkhanpatan7861@gmail.com';

// ── Validation ────────────────────────────────────────────────────────────────

export function isKluEmail(email: string): boolean {
  return email.includes('@') && email.length > 5;
}

export function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone.replace(/\D/g, ''));
}

export function getAuthErrorMessage(err: any): string {
  const msg: string = err?.message ?? '';
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (msg.includes('Email not confirmed')) return 'Check your email for the magic link.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait and try again.';
  if (msg.includes('network')) return 'Network error. Check your connection.';
  return msg || 'Something went wrong. Try again.';
}

// ── Send magic link ───────────────────────────────────────────────────────────

export async function sendMagicLink(email: string, phone: string): Promise<void> {
  if (!isKluEmail(email)) throw new Error('Please enter a valid email address.');
  if (!isValidPhone(phone)) throw new Error('Please enter a valid 10-digit mobile number.');
  localStorage.setItem('klone_phone', phone.replace(/\D/g, ''));
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

// ── Check session (called on mount + after magic link redirect) ───────────────

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
  const existing = await getProfile(u.id);
  return { uid: u.id, email: u.email || '', phone, isNewUser: !existing };
}

// ── Profile extras ────────────────────────────────────────────────────────────

export interface ProfileExtras {
  displayName?: string;
  studentId?: string;
  gender?: 'male' | 'female' | 'other';
  hostel?: string;
}

// ── Save / upsert profile (Supabase only) ─────────────────────────────────────

export async function saveUserProfile(
  uid: string,
  email: string,
  phone: string,
  adminEmail: string = ADMIN_EMAIL,
  extras: ProfileExtras = {}
): Promise<UserProfile> {
  const isAdmin = email.toLowerCase() === adminEmail.toLowerCase();
  const studentId = extras.studentId || extractStudentId(email) || undefined;
  const existing = await getProfile(uid);

  if (existing) {
    const updates: Partial<UserProfile> = {};
    if (phone && existing.phone !== phone) updates.phone = phone;
    if (isAdmin && existing.role !== 'admin') updates.role = 'admin';
    if (extras.displayName && !existing.displayName) updates.displayName = extras.displayName;
    if (studentId && !existing.studentId) updates.studentId = studentId;
    if (extras.gender && !existing.gender) updates.gender = extras.gender;
    if (extras.hostel && !existing.hostel) updates.hostel = extras.hostel;
    const merged = { ...existing, ...updates };
    await upsertProfile({
      id: merged.uid, email: merged.email, display_name: merged.displayName,
      role: merged.role, phone: merged.phone || null, student_id: merged.studentId || null,
      gender: merged.gender || null, hostel: merged.hostel || null,
      k_coins: merged.kCoins ?? 0, streak: merged.streak ?? 0,
      block: merged.block || 'CSE', merchant_outlet_id: merged.merchantOutletId || null,
    });
    return merged;
  }

  const newProfile: UserProfile = {
    uid, email,
    displayName: extras.displayName || email.split('@')[0],
    role: isAdmin ? 'admin' : 'student',
    phone, kCoins: 0, streak: 0, block: 'CSE',
    studentId, gender: extras.gender, hostel: extras.hostel,
  };
  await upsertProfile({
    id: newProfile.uid, email: newProfile.email, display_name: newProfile.displayName,
    role: newProfile.role, phone: newProfile.phone || null, student_id: newProfile.studentId || null,
    gender: newProfile.gender || null, hostel: newProfile.hostel || null,
    k_coins: 0, streak: 0, block: 'CSE', merchant_outlet_id: null,
  });
  return newProfile;
}

// ── Sign out ──────────────────────────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

// ── Merchant code login ───────────────────────────────────────────────────────

const MERCHANT_CODES: Record<string, string> = {
  'FRIENDS2024': 'friends-canteen',
  'TESTCANTEEN': 'test-canteen',
};

export function getMerchantOutletByCode(code: string): string | null {
  return MERCHANT_CODES[code.toUpperCase()] || null;
}
