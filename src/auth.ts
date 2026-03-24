/**
 * auth.ts — KL One Authentication via Supabase email/password
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
  if (msg.includes('Invalid login credentials')) return 'Wrong email or password.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email first. Check your inbox.';
  if (msg.includes('User already registered')) return 'Account already exists. Please sign in.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait and try again.';
  if (msg.includes('network')) return 'Network error. Check your connection.';
  return msg || 'Something went wrong. Try again.';
}

// ─── Register (email + password) ─────────────────────────────────────────────

export async function registerUser(
  email: string,
  password: string,
  phone: string,
  extras: ProfileExtras = {}
): Promise<void> {
  if (!isKluEmail(email)) throw new Error('Please enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (!isValidPhone(phone)) throw new Error('Please enter a valid 10-digit mobile number.');

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        display_name: extras.displayName || email.split('@')[0],
        phone,
        student_id: extras.studentId || '',
        gender: extras.gender || '',
        hostel: extras.hostel || '',
      },
    },
  });
  if (error) throw error;

  // Save profile to Firestore + Supabase immediately (unconfirmed state)
  if (data.user) {
    await saveUserProfile(data.user.id, email, phone, 'salarkhanpatan7861@gmail.com', extras);
  }
}

// ─── Login (email + password) ─────────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;

  const u = data.user;
  const profile = await saveUserProfile(u.id, u.email || '', '', 'salarkhanpatan7861@gmail.com');
  return profile;
}

// ─── Profile Extras ───────────────────────────────────────────────────────────

export interface ProfileExtras {
  displayName?: string;
  studentId?: string;
  gender?: 'male' | 'female' | 'other';
  hostel?: string;
}

// ─── Save / Upsert Profile ────────────────────────────────────────────────────

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

// ─── Sync to Supabase ─────────────────────────────────────────────────────────

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
