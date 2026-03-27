import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChefHat, Mail, Phone, ArrowRight, AlertCircle, Loader2,
  Shield, Eye, EyeOff, GraduationCap, Store, Crown, X,
  CheckCircle2, User, Hash, Lock, Building2, Timer,
} from 'lucide-react';
import { registerUser, getAuthErrorMessage, ProfileExtras, saveUserProfile } from '../auth';
import { supabase } from '../supabase';
import { UserProfile } from '../types';
import { GlassCard } from './GlassCard';
import { ClayButton } from './ClayButton';
import { cn } from '../utils';

const DEV_PIN = 'KLU2026';
const GENDERS = [
  { value: 'male',   label: 'Male'   },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other'  },
];

interface LoginPageProps {
  onSkip: () => void;
  onMagicLinkComplete: (uid: string, email: string, phone: string) => Promise<void>;
  onDevLogin: (role: 'student' | 'merchant' | 'admin') => Promise<void>;
  onMerchantCodeLogin: (code: string) => Promise<boolean>;
}

type Tab      = 'login' | 'register';
type Step     = 'auth' | 'merchant_code' | 'confirmed';
type DevStep  = 'pin' | 'role';

export const LoginPage: React.FC<LoginPageProps> = ({
  onSkip, onMagicLinkComplete, onDevLogin, onMerchantCodeLogin,
}) => {
  const [tab,  setTab]  = useState<Tab>('login');
  const [step, setStep] = useState<Step>('auth');

  // Login
  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading,  setLoginLoading]  = useState(false);
  const [loginError,    setLoginError]    = useState('');
  const [showLoginPw,   setShowLoginPw]   = useState(false);

  // Register
  const [regEmail,    setRegEmail]    = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone,    setRegPhone]    = useState('');
  const [regName,     setRegName]     = useState('');
  const [regUnivId,   setRegUnivId]   = useState('');
  const [regGender,   setRegGender]   = useState<'male' | 'female' | 'other' | ''>('');
  const [regHostel,   setRegHostel]   = useState('');
  const [regLoading,  setRegLoading]  = useState(false);
  const [regError,    setRegError]    = useState('');
  const [showRegPw,   setShowRegPw]   = useState(false);

  // Merchant code
  const [merchantCode,        setMerchantCode]        = useState('');
  const [merchantCodeError,   setMerchantCodeError]   = useState('');
  const [merchantCodeLoading, setMerchantCodeLoading] = useState(false);

  // Dev modal
  const [showDevModal, setShowDevModal] = useState(false);
  const [devStep,      setDevStep]      = useState<DevStep>('pin');
  const [pin,          setPin]          = useState('');
  const [pinError,     setPinError]     = useState('');
  const [showPin,      setShowPin]      = useState(false);
  const [devLoading,   setDevLoading]   = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  // Legal modal
  const [showLegal, setShowLegal] = useState<'terms' | 'privacy' | null>(null);

  // ── Login — retries up to 3x on network errors, no hard timeouts ───────────
  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Enter your email and password.');
      return;
    }
    setLoginLoading(true);
    try {
      let authData: any = null;
      let lastErr: any  = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email:    loginEmail.trim().toLowerCase(),
          password: loginPassword,
        });
        if (!error) { authData = data; break; }
        lastErr = error;
        const m = (error.message ?? '').toLowerCase();
        // Credential / auth errors — show immediately, no retry
        if (
          m.includes('invalid') || m.includes('not confirmed') ||
          m.includes('rate limit') || m.includes('too many')
        ) break;
        // Network / server error — wait then retry
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }

      if (!authData) throw lastErr;

      const uid   = authData.user.id;
      const email = authData.user.email || loginEmail.trim().toLowerCase();

      // Profile load is best-effort — login always succeeds even if DB is slow
      let profile: UserProfile | null = null;
      try { profile = await saveUserProfile(uid, email, '', {}); } catch { /* ignore */ }

      await onMagicLinkComplete(
        profile?.uid   ?? uid,
        profile?.email ?? email,
        profile?.phone ?? '',
      );
    } catch (err: any) {
      setLoginError(getAuthErrorMessage(err));
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register ────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setRegError('');
    if (!regName.trim())        { setRegError('Enter your full name.'); return; }
    if (!regUnivId.trim())      { setRegError('Enter your University ID.'); return; }
    if (!regGender)             { setRegError('Select your gender.'); return; }
    if (!regHostel.trim())      { setRegError('Enter your hostel or residence name.'); return; }
    if (!regEmail.trim())       { setRegError('Enter your email.'); return; }
    if (regPhone.length < 10)   { setRegError('Enter a valid 10-digit mobile number.'); return; }
    if (regPassword.length < 6) { setRegError('Password must be at least 6 characters.'); return; }

    setRegLoading(true);
    try {
      const extras: ProfileExtras = {
        displayName: regName.trim(),
        studentId:   regUnivId.trim(),
        gender:      regGender,
        hostel:      regHostel,
      };
      const profile = await registerUser(regEmail.trim(), regPassword, regPhone, extras);
      if (profile) {
        await onMagicLinkComplete(profile.uid, profile.email, profile.phone || '');
      } else {
        setStep('confirmed');
      }
    } catch (err: any) {
      setRegError(getAuthErrorMessage(err));
    } finally {
      setRegLoading(false);
    }
  };

  // ── Merchant code ───────────────────────────────────────────────────────────
  const handleMerchantCodeLogin = async () => {
    if (!merchantCode.trim()) { setMerchantCodeError('Enter your merchant code.'); return; }
    setMerchantCodeLoading(true);
    setMerchantCodeError('');
    const success = await onMerchantCodeLogin(merchantCode.trim().toUpperCase());
    if (!success) { setMerchantCodeError('Invalid merchant code. Try again.'); setMerchantCodeLoading(false); }
  };

  // ── Dev modal ───────────────────────────────────────────────────────────────
  const openDevModal = () => {
    setPin(''); setPinError(''); setDevStep('pin'); setShowDevModal(true);
    setTimeout(() => pinRef.current?.focus(), 100);
  };
  const handlePinSubmit = () => {
    if (pin === DEV_PIN) { setPinError(''); setDevStep('role'); }
    else { setPinError('Wrong PIN. Try again.'); setPin(''); setTimeout(() => pinRef.current?.focus(), 50); }
  };
  const handleRoleSelect = async (role: 'student' | 'merchant' | 'admin') => {
    setDevLoading(true);
    try { await onDevLogin(role); setShowDevModal(false); }
    catch { setPinError('Login failed.'); }
    finally { setDevLoading(false); }
  };

  const ROLES = [
    { role: 'student'  as const, label: 'Student',  desc: 'Browse food, order, pay, K-Coins',   icon: GraduationCap, color: 'text-klu-red',    bg: 'bg-klu-red/10 border-klu-red/30 hover:border-klu-red/60' },
    { role: 'merchant' as const, label: 'Merchant', desc: 'Dashboard, orders, menu, alerts',     icon: Store,         color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60' },
    { role: 'admin'    as const, label: 'Admin',    desc: 'Analytics, all orders, system tools', icon: Crown,         color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60' },
  ];

  return (
    <div className="min-h-screen bg-crimson-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] radial-glow opacity-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] radial-glow opacity-20" />

      {/* Back to landing */}
      <a href="/" className="absolute top-5 left-5 z-20 flex items-center gap-2 text-white/30 hover:text-white transition-colors text-sm font-bold group">
        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
        <span className="hidden sm:inline">Back to Home</span>
      </a>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6 z-10">

        {/* Logo */}
        <div className="text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className="w-20 h-20 bg-klu-red rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-[0_20px_40px_rgba(200,16,46,0.3)] border border-white/10">
            <ChefHat className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-display text-5xl font-black tracking-tighter text-white">KL ONE</h1>
          <p className="text-white/40 font-medium mt-1">Campus Dining, Reimagined.</p>
        </div>

        <AnimatePresence mode="wait">

          {/* Email confirmed */}
          {step === 'confirmed' && (
            <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <GlassCard className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-black text-white">Check your inbox</h2>
                <p className="text-sm text-white/40">A confirmation email was sent to<br /><span className="text-white font-bold">{regEmail}</span></p>
                <p className="text-xs text-white/30">Click the link in the email to activate your account, then sign in.</p>
                <button onClick={() => { setStep('auth'); setTab('login'); setLoginEmail(regEmail); }}
                  className="w-full py-3 bg-klu-red rounded-2xl text-white font-black text-sm">
                  Go to Sign In
                </button>
              </GlassCard>
            </motion.div>
          )}

          {/* Merchant code */}
          {step === 'merchant_code' && (
            <motion.div key="merchant_code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <GlassCard className="p-8 space-y-4">
                <h2 className="text-xl font-black text-white">Merchant Login</h2>
                <p className="text-xs text-white/40">Enter your unique merchant code to access your dashboard.</p>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input type="text" placeholder="Enter merchant code"
                    className="w-full h-14 bg-[#1a0a0e] border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 text-white placeholder:text-white/20 uppercase tracking-widest"
                    style={{ colorScheme: 'dark' }}
                    value={merchantCode}
                    onChange={e => { setMerchantCode(e.target.value.toUpperCase()); setMerchantCodeError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleMerchantCodeLogin()}
                  />
                </div>
                {merchantCodeError && <ErrorBox message={merchantCodeError} />}
                <ClayButton onClick={handleMerchantCodeLogin} className="w-full h-14" disabled={merchantCodeLoading || !merchantCode}>
                  {merchantCodeLoading ? 'Verifying...' : 'Access Dashboard'}
                </ClayButton>
                <button onClick={() => { setStep('auth'); setMerchantCode(''); setMerchantCodeError(''); }}
                  className="text-xs font-bold text-white/40 hover:text-white transition-colors flex items-center gap-1 mx-auto">
                  <ArrowRight className="w-3 h-3 rotate-180" /> Back to sign in
                </button>
              </GlassCard>
            </motion.div>
          )}

          {/* Main auth */}
          {step === 'auth' && (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Tab switcher */}
              <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                {(['login', 'register'] as Tab[]).map(t => (
                  <button key={t} onClick={() => { setTab(t); setLoginError(''); setRegError(''); }}
                    className={cn('flex-1 py-2.5 rounded-xl text-sm font-black transition-all capitalize',
                      tab === t ? 'bg-klu-red text-white shadow-lg' : 'text-white/40 hover:text-white/70')}>
                    {t === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>

              <GlassCard className="p-6 bg-[#1a0a0e]/80">
                <AnimatePresence mode="wait">

                  {/* LOGIN */}
                  {tab === 'login' && (
                    <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                      <form onSubmit={e => { e.preventDefault(); handleLogin(); }} className="space-y-4">
                        <InputField icon={<Mail className="w-5 h-5" />} type="email" placeholder="Email address"
                          value={loginEmail} onChange={setLoginEmail} onEnter={handleLogin} />
                        <PasswordField placeholder="Password" value={loginPassword}
                          show={showLoginPw} onToggle={() => setShowLoginPw(v => !v)}
                          onChange={setLoginPassword} onEnter={handleLogin} />
                        {loginError && <ErrorBox message={loginError} />}
                        <ClayButton type="submit" onClick={handleLogin} className="w-full h-14" disabled={loginLoading}>
                          {loginLoading
                            ? <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            : 'Sign In'}
                        </ClayButton>
                      </form>
                    </motion.div>
                  )}

                  {/* REGISTER */}
                  {tab === 'register' && (
                    <motion.div key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                      <InputField icon={<User className="w-5 h-5" />} type="text" placeholder="Full Name" value={regName} onChange={setRegName} />
                      <InputField icon={<Hash className="w-5 h-5" />} type="text" placeholder="University ID Number" value={regUnivId} onChange={setRegUnivId} />
                      <InputField icon={<Mail className="w-5 h-5" />} type="email" placeholder="Email address" value={regEmail} onChange={setRegEmail} />
                      <InputField icon={<Phone className="w-5 h-5" />} type="tel" placeholder="Mobile Number (10 digits)"
                        value={regPhone} onChange={v => setRegPhone(v.replace(/\D/g, '').slice(0, 10))} />
                      <PasswordField placeholder="Password (min 6 chars)" value={regPassword}
                        show={showRegPw} onToggle={() => setShowRegPw(v => !v)} onChange={setRegPassword} />

                      {/* Gender */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Gender</p>
                        <div className="flex gap-2">
                          {GENDERS.map(g => (
                            <button key={g.value} onClick={() => setRegGender(g.value as any)}
                              className={cn('flex-1 h-11 rounded-xl border text-xs font-black transition-all',
                                regGender === g.value ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40')}>
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Hostel */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Hostel / Residence</p>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 pointer-events-none" />
                          <input type="text" placeholder="e.g. Vindhya Hostel, Day Scholar..."
                            value={regHostel} onChange={e => setRegHostel(e.target.value)}
                            style={{ colorScheme: 'dark' }}
                            className="w-full h-14 bg-[#1a0a0e] border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-klu-red/50" />
                        </div>
                      </div>

                      {regError && <ErrorBox message={regError} />}
                      <ClayButton onClick={handleRegister} className="w-full h-14" disabled={regLoading}>
                        {regLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Account'}
                      </ClayButton>
                    </motion.div>
                  )}

                </AnimatePresence>
              </GlassCard>

              {/* Merchant + Skip + Dev */}
              <button onClick={() => setStep('merchant_code')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 text-white/30 hover:border-emerald-500/40 hover:text-emerald-400/70 transition-all text-xs font-black uppercase tracking-widest">
                <Store className="w-4 h-4" /> Merchant Login
              </button>

              <div className="flex items-center justify-between">
                <button onClick={onSkip} className="text-white/30 hover:text-white transition-all font-bold text-sm flex items-center gap-1">
                  Skip for now <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={openDevModal}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-white/10 text-white/20 hover:border-amber-500/40 hover:text-amber-400/60 transition-all">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Dev</span>
                </button>
              </div>

              <p className="text-center text-[10px] text-white/20 leading-relaxed">
                By continuing, you agree to our{' '}
                <button onClick={() => setShowLegal('terms')} className="text-white/40 underline hover:text-white transition-colors">Terms & Conditions</button>
                {' '}and{' '}
                <button onClick={() => setShowLegal('privacy')} className="text-white/40 underline hover:text-white transition-colors">Privacy Policy</button>
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      {/* Legal Modal */}
      <AnimatePresence>
        {showLegal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowLegal(null)}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm glass-frosted rounded-[32px] border border-white/10 p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg">{showLegal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}</h3>
                <button onClick={() => setShowLegal(null)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {showLegal === 'terms' ? (
                <div className="space-y-3 text-xs text-white/50 leading-relaxed">
                  <p className="text-white/70 font-bold">Last updated: March 2026</p>
                  <p>By using KL ONE, you agree to these terms. KL ONE is a campus food ordering and payment platform for KL University students and merchants.</p>
                  <p className="font-bold text-white/70">Payments</p>
                  <p>All payments are processed via Cashfree. A platform fee of ₹2.50 applies per transaction. Payments are non-refundable once processed unless the order is cancelled by the merchant.</p>
                  <p className="font-bold text-white/70">K-Coins</p>
                  <p>K-Coins are reward points with no monetary value. They cannot be transferred or redeemed for cash.</p>
                  <p className="font-bold text-white/70">Prohibited Use</p>
                  <p>You may not use KL ONE for fraudulent transactions or any activity that violates KL University's code of conduct.</p>
                  <p className="font-bold text-white/70">Liability</p>
                  <p>KL ONE is not liable for delays in food preparation, payment gateway failures, or indirect damages.</p>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-white/50 leading-relaxed">
                  <p className="text-white/70 font-bold">Last updated: March 2026</p>
                  <p>KL ONE collects your name, email, phone, university ID, hostel, and transaction data to operate the platform.</p>
                  <p className="font-bold text-white/70">How We Use It</p>
                  <p>Your data is used to process orders, award K-Coins, and provide support. We do not sell your data.</p>
                  <p className="font-bold text-white/70">Payments</p>
                  <p>Payment processing is by Cashfree. We store transaction IDs but never your card or UPI credentials.</p>
                  <p className="font-bold text-white/70">Your Rights</p>
                  <p>Request account deletion via the Support section in the app.</p>
                </div>
              )}
              <button onClick={() => setShowLegal(null)} className="mt-5 w-full py-3 bg-klu-red rounded-2xl text-white font-black text-sm">Got it</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dev Login Modal */}
      <AnimatePresence>
        {showDevModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={e => { if (e.target === e.currentTarget) setShowDevModal(false); }}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm glass-frosted rounded-[32px] border border-white/10 p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-black text-sm">Dev Access</p>
                    <p className="text-[10px] text-white/30">{devStep === 'pin' ? 'Enter PIN to continue' : 'Select a role to test'}</p>
                  </div>
                </div>
                <button onClick={() => setShowDevModal(false)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AnimatePresence mode="wait">
                {devStep === 'pin' && (
                  <motion.div key="pin" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                    <div className="relative">
                      <input ref={pinRef} type={showPin ? 'text' : 'password'} placeholder="Enter dev PIN"
                        value={pin} onChange={e => { setPin(e.target.value); setPinError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                        className="w-full h-14 bg-[#1a0a0e] border border-white/10 rounded-2xl px-4 pr-12 text-lg font-black tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-white placeholder:text-white/20 placeholder:tracking-normal"
                        style={{ colorScheme: 'dark' }} />
                      <button onClick={() => setShowPin(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60">
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {pinError && <ErrorBox message={pinError} />}
                    <ClayButton onClick={handlePinSubmit} className="w-full h-14" disabled={!pin}>Verify PIN →</ClayButton>
                  </motion.div>
                )}
                {devStep === 'role' && (
                  <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                    {devLoading
                      ? <div className="flex flex-col items-center gap-3 py-8"><Loader2 className="w-8 h-8 text-klu-red animate-spin" /><p className="text-white/40 text-sm font-bold">Logging in...</p></div>
                      : ROLES.map(({ role, label, desc, icon: Icon, color, bg }) => (
                        <button key={role} onClick={() => handleRoleSelect(role)}
                          className={cn('w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98]', bg)}>
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 flex-shrink-0', color)}><Icon className="w-6 h-6" /></div>
                          <div className="text-left">
                            <p className={cn('font-black text-sm', color)}>{label}</p>
                            <p className="text-white/30 text-xs mt-0.5">{desc}</p>
                          </div>
                          <ArrowRight className={cn('w-4 h-4 ml-auto flex-shrink-0', color)} />
                        </button>
                      ))
                    }
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Reusable sub-components ───────────────────────────────────────────────────

const InputField: React.FC<{
  icon: React.ReactNode; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; onEnter?: () => void;
}> = ({ icon, type, placeholder, value, onChange, onEnter }) => (
  <div className="relative">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">{icon}</span>
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      autoComplete={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'off'}
      style={{ colorScheme: 'dark' }}
      className="w-full h-14 bg-[#1a0a0e] border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-klu-red/50"
    />
  </div>
);

const PasswordField: React.FC<{
  placeholder: string; value: string; show: boolean;
  onToggle: () => void; onChange: (v: string) => void; onEnter?: () => void;
}> = ({ placeholder, value, show, onToggle, onChange, onEnter }) => (
  <div className="relative">
    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 pointer-events-none" />
    <input
      type={show ? 'text' : 'password'} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      autoComplete="current-password"
      style={{ colorScheme: 'dark' }}
      className="w-full h-14 bg-[#1a0a0e] border border-white/10 rounded-2xl pl-12 pr-12 text-sm font-bold text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-klu-red/50"
    />
    <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
      {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  </div>
);

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
    <p className="text-xs font-bold text-red-400">{message}</p>
  </div>
);
