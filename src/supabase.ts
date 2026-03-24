import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hnezkwnefmjvbdwlyubj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-vmOek-tuP3rVG1-liLJAw_HRbAx0Bi';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export function extractStudentId(email: string): string | null {
  const match = email.match(/^(\d{10})@kluniversity\.in$/i);
  return match ? match[1] : null;
}

// ── Upsert profile to Supabase profiles table ─────────────────────────────────
export async function upsertProfile(profile: {
  id: string;
  email: string;
  display_name: string;
  role: string;
  phone?: string | null;
  student_id?: string | null;
  gender?: string | null;
  hostel?: string | null;
  k_coins?: number;
  streak?: number;
  block?: string;
  merchant_outlet_id?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    ...profile,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) console.warn('Supabase upsert failed:', error.message);
}

// ── Award K-Coins in Supabase ─────────────────────────────────────────────────
export async function awardKCoinsSupabase(userId: string, coins: number): Promise<number> {
  const { data, error } = await supabase.rpc('increment_kcoins', { user_id: userId, amount: coins });
  if (error) {
    // Fallback: manual update
    const { data: profile } = await supabase.from('profiles').select('k_coins').eq('id', userId).single();
    const current = (profile as any)?.k_coins || 0;
    await supabase.from('profiles').update({ k_coins: current + coins }).eq('id', userId);
    return current + coins;
  }
  return data as number;
}
