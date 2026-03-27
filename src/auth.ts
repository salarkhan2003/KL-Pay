import { supabase, upsertProfile, extractStudentId } from './supabase';
import { UserProfile } from './types';

export function getAuthErrorMessage(err: any): string {
  const msg: string = err?.message ?? '';
  if (msg.includes('Invalid login credentials'))    return 'Wrong email or password.';
  if (msg.includes('Email not confirmed'))          return 'Please confirm your email first. Check your inbox.';
  if (msg.includes('User already registered'))      return 'Account already exists. Please sign in.';
  if (msg.includes('rate limit'))                   return 'Too many attempts. Please wait and try again.';
  if (msg.includes('Database error'))               return 'Registration failed. Please try again in a moment.';
  if (msg.includes('duplicate key'))                return 'Account already exists. Please sign in.';
  if (msg.includes('violates'))                     return 'Registration failed. Please try again.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Check your connection.';
  return msg || 'Something went wrong. Try again.';
}

export interface ProfileExtras {
  displayName?: string;
  studentId?: string;
  gender?: 'male' | 'female' | 'other';
  hostel?: string;
}

// ── Register ──────────────────────────────────────────────────────────────────
export async function registerUser(email: string, password: string, phone: string, extras: ProfileExtras = {}): Promise<UserProfile | null> {
  if (!email.includes('@')) throw new Error('Please enter a valid email address.');
  if (password.length < 6)  throw new Error('Password must be at least 6 characters.');
  if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) throw new Error('Please enter a valid 10-digit mobile number.');

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        display_name: extras.displayName || email.split('@')[0],
        phone,
        student_id: extras.studentId || '',
        gender:     extras.gender    || '',
        hostel:     extras.hostel    || '',
      },
    },
  });

  // Auth-level error (e.g. already registered, rate limit) — throw so UI shows it
  if (error) throw error;

  if (data.user) {
    // Save profile — but NEVER let a DB error block the user from logging in.
    // If the profile upsert fails, we fall back to a local profile object.
    let profile: UserProfile;
    try {
      profile = await saveUserProfile(data.user.id, email, phone, extras);
    } catch {
      profile = {
        uid: data.user.id,
        email: email.toLowerCase(),
        displayName: extras.displayName || email.split('@')[0],
        role: 'student',
        phone,
        kCoins: 0,
        streak: 0,
        block: 'CSE',
        studentId: extras.studentId,
        gender: extras.gender,
        hostel: extras.hostel,
      };
    }
    // Session present = email confirmation disabled → log in immediately
    if (data.session) return profile;
  }

  // Email confirmation required
  return null;
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
      const patch: Record<string, any> = {};
      if (isAdmin && existing.role !== 'admin') patch.role = 'admin';
      if (phone && !existing.phone) patch.phone = phone;
      if (Object.keys(patch).length > 0) {
        await supabase.from('profiles').update(patch).eq('id', uid);
      }
      return rowToProfile({ ...existing, ...patch });
    }

    // New user — upsert with only columns that exist in the schema
    const newRow = {
      id: uid,
      email: email.toLowerCase(),
      display_name: extras.displayName || email.split('@')[0],
      role: isAdmin ? 'admin' : 'student',
      phone: phone || null,
      k_coins: 0,
      streak: 0,
      block: 'CSE',
      student_id: studentId || null,
      gender: extras.gender || null,
      hostel: extras.hostel || null,
    };
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert(newRow, { onConflict: 'id', ignoreDuplicates: false });
    if (upsertErr) {
      console.warn('profile upsert:', upsertErr.message, upsertErr.code);
      // Retry with absolute minimum columns
      const { error: minErr } = await supabase.from('profiles').upsert(
        { id: uid, email: email.toLowerCase(), display_name: extras.displayName || email.split('@')[0], role: isAdmin ? 'admin' : 'student' },
        { onConflict: 'id', ignoreDuplicates: false }
      );
      if (minErr) console.warn('profile min upsert:', minErr.message);
    }
    return rowToProfile({ ...newRow, id: uid });
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
// Codes are stored in the `outlets` table (login_code column).
// To add/remove/change a merchant code → update it directly in Supabase.
export async function getMerchantOutletByCode(code: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('outlets')
    .select('id')
    .eq('login_code', code.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}
