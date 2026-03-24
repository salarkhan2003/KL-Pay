import { supabase, upsertProfile, extractStudentId } from './supabase';
import { UserProfile } from './types';

export function getAuthErrorMessage(err: any): string {
  const msg: string = err?.message ?? '';
  if (msg.includes('Invalid login credentials')) return 'Wrong email or password.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email first. Check your inbox.';
  if (msg.includes('User already registered')) return 'Account already exists. Please sign in.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait and try again.';
  return msg || 'Something went wrong. Try again.';
}

export interface ProfileExtras {
  displayName?: string;
  studentId?: string;
  gender?: 'male' | 'female' | 'other';
  hostel?: string;
}

// ── Register ──────────────────────────────────────────────────────────────────
export async function registerUser(email: string, password: string, phone: string, extras: ProfileExtras = {}): Promise<void> {
  if (!email.includes('@')) throw new Error('Please enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) throw new Error('Please enter a valid 10-digit mobile number.');

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { display_name: extras.displayName || email.split('@')[0], phone, student_id: extras.studentId || '', gender: extras.gender || '', hostel: extras.hostel || '' },
    },
  });
  if (error) throw error;
  if (data.user) {
    await saveUserProfile(data.user.id, email, phone, extras);
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return saveUserProfile(data.user.id, data.user.email || '', '', {});
}

// ── Save profile (Supabase only) ──────────────────────────────────────────────
export async function saveUserProfile(uid: string, email: string, phone: string, extras: ProfileExtras = {}): Promise<UserProfile> {
  const isAdmin = email.toLowerCase() === 'salarkhanpatan7861@gmail.com';
  const studentId = extras.studentId || extractStudentId(email) || undefined;

  try {
    // First try a fast select — if row exists, return it (avoids unnecessary writes)
    const { data: existing, error: fetchErr } = await supabase
      .from('profiles').select('*').eq('id', uid).maybeSingle();

    if (fetchErr && (fetchErr.code === 'PGRST205' || fetchErr.message?.includes('schema cache') || fetchErr.code === '42P01')) {
      return buildLocalProfile(uid, email, phone, extras, isAdmin, studentId);
    }

    if (existing) {
      // Only patch fields that need updating (role promotion, missing phone)
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (isAdmin && existing.role !== 'admin') patch.role = 'admin';
      if (phone && !existing.phone) patch.phone = phone;
      if (Object.keys(patch).length > 1) {
        await supabase.from('profiles').update(patch).eq('id', uid);
      }
      return rowToProfile({ ...existing, ...patch });
    }

    // New user — insert
    const newRow = {
      id: uid, email: email.toLowerCase(),
      display_name: extras.displayName || email.split('@')[0],
      role: isAdmin ? 'admin' : 'student',
      phone: phone || null, k_coins: 0, streak: 0, block: 'CSE',
      student_id: studentId || null, gender: extras.gender || null, hostel: extras.hostel || null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const { error: insertErr } = await supabase.from('profiles').insert(newRow);
    if (insertErr && insertErr.code !== '23505') console.warn('profile insert:', insertErr.message);
    return rowToProfile(newRow);
  } catch (e: any) {
    console.warn('saveUserProfile fallback:', e?.message);
    return buildLocalProfile(uid, email, phone, extras, isAdmin, studentId);
  }
}

function buildLocalProfile(uid: string, email: string, phone: string, extras: ProfileExtras, isAdmin: boolean, studentId?: string): UserProfile {
  return {
    uid, email, displayName: extras.displayName || email.split('@')[0],
    role: isAdmin ? 'admin' : 'student', phone: phone || '',
    kCoins: 0, streak: 0, block: 'CSE',
    studentId, gender: extras.gender, hostel: extras.hostel,
  };
}

function rowToProfile(r: any): UserProfile {
  return {
    uid: r.id, email: r.email, displayName: r.display_name || r.email,
    role: r.role || 'student', phone: r.phone || '', kCoins: r.k_coins || 0,
    streak: r.streak || 0, block: r.block || 'CSE',
    studentId: r.student_id || undefined, gender: r.gender || undefined,
    hostel: r.hostel || undefined, merchantOutletId: r.merchant_outlet_id || undefined,
  };
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
