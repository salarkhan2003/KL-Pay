import { supabase, upsertProfile, extractStudentId } from './supabase';
import { UserProfile } from './types';

export function getAuthErrorMessage(err: any): string {
  const msg: string = (err?.message ?? err?.error_description ?? String(err ?? '')).toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) return 'Wrong email or password.';
  if (msg.includes('email not confirmed'))          return 'Please confirm your email first. Check your inbox.';
  if (msg.includes('user already registered'))      return 'Account already exists. Please sign in.';
  if (msg.includes('rate limit') || msg.includes('too many'))  return 'Too many attempts. Please wait 30 seconds and try again.';
  if (msg.includes('database error'))               return 'Server error. Please try again in a moment.';
  if (msg.includes('duplicate key'))                return 'Account already exists. Please sign in.';
  if (msg.includes('violates'))                     return 'Registration failed. Please try again.';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch') || msg.includes('load failed') || msg.includes('networkerror')) return 'Network error. Check your connection and try again.';
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) return 'Connection slow. Please try again.';
  // Return original message if it's meaningful, otherwise generic
  const original = err?.message ?? '';
  return original.length > 3 ? original : 'Something went wrong. Please try again.';
}

export interface ProfileExtras {
  displayName?: string;
  studentId?: string;
  gender?: 'male' | 'female' | 'other';
  hostel?: string;
}

// ── Retry helper — retries fn up to `times` with exponential backoff ──────────
async function withRetry<T>(fn: () => Promise<T>, times = 3, delayMs = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < times; i++) {
    try { return await fn(); } catch (e: any) {
      lastErr = e;
      // Don't retry on auth errors (wrong password, rate limit, etc.)
      const msg = (e?.message ?? '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('not confirmed') || msg.includes('already registered') || msg.includes('rate limit')) throw e;
      if (i < times - 1) await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

// ── Register ──────────────────────────────────────────────────────────────────
export async function registerUser(
  email: string, password: string, phone: string, extras: ProfileExtras = {}
): Promise<UserProfile | null> {
  if (!email.includes('@')) throw new Error('Please enter a valid email address.');
  if (password.length < 6)  throw new Error('Password must be at least 6 characters.');
  if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) throw new Error('Please enter a valid 10-digit mobile number.');

  const { data, error } = await withRetry(() =>
    supabase.auth.signUp({
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
    })
  );

  if (error) throw error;

  if (data.user) {
    let profile: UserProfile;
    try {
      profile = await saveUserProfile(data.user.id, email, phone, extras);
    } catch {
      profile = buildLocalProfile(data.user.id, email, phone, extras,
        email.toLowerCase() === 'salarkhanpatan7861@gmail.com',
        extras.studentId || extractStudentId(email) || undefined);
    }
    if (data.session) return profile;
  }
  return null;
}

// ── Login — never throws on network issues, always returns a profile ──────────
export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await withRetry(() =>
    supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  );
  if (error) throw error;
  return saveUserProfile(data.user.id, data.user.email || '', '', {});
}

// ── Save profile — fully fault-tolerant, never throws ────────────────────────
export async function saveUserProfile(
  uid: string, email: string, phone: string, extras: ProfileExtras = {}
): Promise<UserProfile> {
  const isAdmin  = email.toLowerCase() === 'salarkhanpatan7861@gmail.com';
  const studentId = extras.studentId || extractStudentId(email) || undefined;
  const fallback  = buildLocalProfile(uid, email, phone, extras, isAdmin, studentId);

  try {
    // 1. Try to fetch existing profile
    const { data: existing, error: fetchErr } = await supabase
      .from('profiles').select('*').eq('id', uid).maybeSingle();

    // Schema/table missing — return local profile, don't crash
    if (fetchErr) {
      const code = fetchErr.code ?? '';
      const msg  = fetchErr.message ?? '';
      if (code === 'PGRST205' || code === '42P01' || msg.includes('schema cache') || msg.includes('does not exist')) {
        return fallback;
      }
      // Any other DB error — still return fallback so login succeeds
      console.warn('saveUserProfile fetch:', msg);
      return fallback;
    }

    if (existing) {
      // Patch only what changed
      const patch: Record<string, any> = {};
      if (isAdmin && existing.role !== 'admin') patch.role = 'admin';
      if (phone && !existing.phone) patch.phone = phone;
      if (Object.keys(patch).length > 0) {
        supabase.from('profiles').update(patch).eq('id', uid).then(({ error: e }) => { if (e) console.warn('profile patch:', e.message); });
      }
      return rowToProfile({ ...existing, ...patch });
    }

    // 2. New user — upsert full row
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
      // Retry with minimal columns
      await supabase.from('profiles').upsert(
        { id: uid, email: email.toLowerCase(), display_name: extras.displayName || email.split('@')[0], role: isAdmin ? 'admin' : 'student' },
        { onConflict: 'id', ignoreDuplicates: false }
      ).then(({ error: e }) => { if (e) console.warn('profile min upsert:', e.message); });
    }

    return rowToProfile({ ...newRow, id: uid });
  } catch (e: any) {
    console.warn('saveUserProfile fallback:', e?.message);
    return fallback;
  }
}

function buildLocalProfile(
  uid: string, email: string, phone: string,
  extras: ProfileExtras, isAdmin: boolean, studentId?: string
): UserProfile {
  return {
    uid, email,
    displayName: extras.displayName || email.split('@')[0],
    role: isAdmin ? 'admin' : 'student',
    phone: phone || '',
    kCoins: 0, streak: 0, block: 'CSE',
    studentId, gender: extras.gender, hostel: extras.hostel,
  };
}

function rowToProfile(r: any): UserProfile {
  return {
    uid: r.id, email: r.email,
    displayName: r.display_name || r.email,
    role: r.role || 'student',
    phone: r.phone || '',
    kCoins: r.k_coins || 0,
    streak: r.streak || 0,
    block: r.block || 'CSE',
    studentId: r.student_id || undefined,
    gender: r.gender || undefined,
    hostel: r.hostel || undefined,
    merchantOutletId: r.merchant_outlet_id || undefined,
  };
}

// ── Sign out — never throws ───────────────────────────────────────────────────
export async function signOutUser(): Promise<void> {
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
}

// ── Merchant code login ───────────────────────────────────────────────────────
export async function getMerchantOutletByCode(code: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('outlets')
      .select('id')
      .eq('login_code', code.toUpperCase())
      .maybeSingle();
    if (error || !data) return null;
    return data.id;
  } catch { return null; }
}
