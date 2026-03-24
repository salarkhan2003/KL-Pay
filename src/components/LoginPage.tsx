import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChefHat, Mail, Phone, ArrowRight, AlertCircle, Loader2,
  Shield, Eye, EyeOff, GraduationCap, Store, Crown, X,
  CheckCircle2, RefreshCw, User, Hash, Home, ChevronDown,
} from 'lucide-react';
import {
  sendMagicLink, checkSession, getAuthErrorMessage, isKluEmail,
  saveUserProfile, ProfileExtras, getMerchantOutletByCode,
} from '../auth';
import { GlassCard } from './GlassCard';
import { ClayButton } from './ClayButton';
import { cn } from '../utils';

const DEV_PIN = 'KLU2026';
const ADMIN_EMAIL = 'salarkhanpatan7861@gmail.com';

const HOSTELS = [
  'Tulip Hostel',
  'Day Scholar',
  'Other',
];

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

interface LoginPageProps {
  onSkip: () => void;
  onMagicLinkComplete: (uid: string, email: string, phone: string) => Promise<void>;
  onDevLogin: (role: 'student' | 'merchant' | 'admin') => Promise<void>;
  onMerchantCodeLogin: (code: string) => Promise<boolean>;
}

type Step = 'form' | 'sent' | 'merchant_code' | 'completing' | 'profile_setup';
type DevStep = 'pin' | 'role';

// Pending new-user data held between magic link completion and profile setup
interface PendingUser {
  uid: string;
  email: string;
  phone: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSkip, onMagicLinkComplete, onDevLogin, onMerchantCodeLogin }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [merchantCode, setMerchantCode] = useState('');
  const [merchantCodeError, setMerchantCodeError] = useState('');
  const [merchantCodeLoading, setMerchantCodeLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);

  // Profile setup fields
  const [setupName, setSetupName] = useState('');
  const [setupUnivId, setSetupUnivId] = useState('');
  const [setupGender, setSetupGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [setupHostel, setSetupHostel] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Dev login modal
  const [showDevModal, setShowDevModal] = useState(false);
  const [devStep, setDevStep] = useState<DevStep>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  // Detect Supabase session on load (handles magic link redirect)
  useEffect(() => {
    (async () => {
      try {
        const result = await checkSession();
        if (!result) return;
        if (result.isNewUser) {
          setPendingUser({ uid: result.uid, email: result.email, phone: result.phone });
          setStep('profile_setup');
        } else {
          setStep('completing');
          await onMagicLinkComplete(result.uid, result.email, result.phone);
        }
      } catch (err: any) {
        setError(getAuthErrorMessage(err));
        setStep('form');
      }
    })();
  }, []);

  const handleSendLink = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendMagicLink(email.trim(), phone);
      setStep('sent');
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCrossDeviceSignIn = async () => {
    // No longer needed — Supabase handles cross-device automatically
  };

  const handleMerchantCodeLogin = async () => {
    if (!merchantCode.trim()) { setMerchantCodeError('Enter your merchant code.'); return; }
    setMerchantCodeLoading(true);
    setMerchantCodeError('');
    const success = await onMerchantCodeLogin(merchantCode.trim().toUpperCase());
    if (!success) {
      setMerchantCodeError('Invalid merchant code. Try again.');
      setMerchantCodeLoading(false);
    }
  };

  const handleProfileSetup = async () => {
    if (!pendingUser) return;
    if (!setupName.trim()) { setSetupError('Please enter your name.'); return; }
    if (!setupUnivId.trim()) { setSetupError('Please enter your University ID.'); return; }
    if (!setupGender) { setSetupError('Please select your gender.'); return; }
    if (!setupHostel) { setSetupError('Please select your hostel.'); return; }

    setSetupLoading(true);
    setSetupError(null);
    try {
      const extras: ProfileExtras = {
        displayName: setupName.trim(),
        studentId: setupUnivId.trim(),
        gender: setupGender,
        hostel: setupHostel,
      };
      await saveUserProfile(pendingUser.uid, pendingUser.email, pendingUser.phone, ADMIN_EMAIL, extras);
      setStep('completing');
      await onMagicLinkComplete(pendingUser.uid, pendingUser.email, pendingUser.phone);
    } catch (err: any) {
      setSetupError(err.message || 'Failed to save profile. Try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  // Dev modal
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
    { role: 'student' as const, label: 'Student', desc: 'Browse food, order, pay, K-Coins', icon: GraduationCap, color: 'text-klu-red', bg: 'bg-klu-red/10 border-klu-red/30 hover:border-klu-red/60' },
    { role: 'merchant' as const, label: 'Merchant', desc: 'Dashboard, orders, menu, alerts', icon: Store, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60' },
    { role: 'admin' as const, label: 'Admin', desc: 'Analytics, all orders, system tools', icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60' },
  ];

  return (
    <div className="min-h-screen bg-crimson-dark flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] radial-glow opacity-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] radial-glow opacity-20" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-8 z-10">

        {/* Logo */}
        <div className="text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className="w-20 h-20 bg-klu-red rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-[0_20px_40px_rgba(200,16,46,0.3)] border border-white/10">
            <ChefHat className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-display text-5xl font-black tracking-tighter text-white">KL ONE</h1>
          <p className="text-white/40 font-medium mt-2">Campus Dining, Reimagined.</p>
        </div>

        {/* Auth card */}
        <GlassCard className="p-8 space-y-6">
          <AnimatePresence mode="wait">

            {/* Completing */}
            {step === 'completing' && (
              <motion.div key="completing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="w-10 h-10 text-klu-red animate-spin" />
                <p className="text-white/60 font-medium text-sm">Signing you in...</p>
              </motion.div>
            )}

            {/* Magic link sent */}
            {step === 'sent' && (
              <motion.div key="sent" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className="space-y-4 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-black text-white">Check your inbox</h2>
                <p className="text-sm text-white/40">Magic link sent to<br /><span className="text-white font-bold">{email}</span></p>
                <p className="text-xs text-white/30">Tap the link in the email to sign in instantly.</p>
                <button onClick={() => { setStep('form'); setError(null); }}
                  className="text-xs font-bold text-white/40 hover:text-white transition-colors flex items-center gap-1 mx-auto">
                  <RefreshCw className="w-3 h-3" /> Use a different email
                </button>
              </motion.div>
            )}

            {/* Merchant code login */}
            {step === 'merchant_code' && (
              <motion.div key="merchant_code" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="text-xl font-black text-white">Merchant Login</h2>
                <p className="text-xs text-white/40">Enter your unique merchant code to access your dashboard.</p>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input type="text" placeholder="e.g. FRIENDS2024"
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 text-white placeholder:text-white/20 uppercase tracking-widest"
                    value={merchantCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setMerchantCode(e.target.value.toUpperCase()); setMerchantCodeError(''); }}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleMerchantCodeLogin()}
                  />
                </div>
                {merchantCodeError && <ErrorBox message={merchantCodeError} />}
                <ClayButton onClick={handleMerchantCodeLogin} className="w-full h-14" disabled={merchantCodeLoading || !merchantCode}>
                  {merchantCodeLoading ? 'Verifying...' : 'Access Dashboard'}
                </ClayButton>
                <button onClick={() => { setStep('form'); setMerchantCode(''); setMerchantCodeError(''); }}
                  className="text-xs font-bold text-white/40 hover:text-white transition-colors flex items-center gap-1 mx-auto">
                  <ArrowRight className="w-3 h-3 rotate-180" /> Back to sign in
                </button>
              </motion.div>
            )}

            {/* Profile setup — new users only */}
            {step === 'profile_setup' && (
              <motion.div key="profile_setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h2 className="text-xl font-black text-white">Complete your profile</h2>
                  <p className="text-xs text-white/40 mt-1">Just a few details to get you started</p>
                </div>

                <div className="space-y-3">
                  {/* Name */}
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      autoCapitalize="words"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 text-white placeholder:text-white/20"
                      value={setupName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSetupName(e.target.value)}
                    />
                  </div>

                  {/* University ID */}
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                      type="text"
                      placeholder="University ID Number"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 text-white placeholder:text-white/20"
                      value={setupUnivId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSetupUnivId(e.target.value)}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 pl-1">Gender</p>
                    <div className="flex gap-2">
                      {GENDERS.map(g => (
                        <button
                          key={g.value}
                          onClick={() => setSetupGender(g.value as 'male' | 'female' | 'other')}
                          className={cn(
                            'flex-1 h-12 rounded-2xl border text-sm font-black transition-all',
                            setupGender === g.value
                              ? 'bg-klu-red border-klu-red text-white'
                              : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'
                          )}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hostel */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 pl-1">Hostel</p>
                    <div className="relative">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 pointer-events-none z-10" />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 pointer-events-none z-10" />
                      <select
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 text-white appearance-none cursor-pointer"
                        value={setupHostel}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSetupHostel(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="" disabled className="bg-gray-900">Select your hostel</option>
                        {HOSTELS.map(h => (
                          <option key={h} value={h} className="bg-gray-900">{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {setupError && <ErrorBox message={setupError} />}

                <ClayButton
                  onClick={handleProfileSetup}
                  className="w-full h-14"
                  disabled={setupLoading || !setupName || !setupUnivId || !setupGender || !setupHostel}
                >
                  {setupLoading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center">
                      Continue <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </ClayButton>
              </motion.div>
            )}

            {/* Sign in form */}
            {step === 'form' && (
              <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Sign In</h2>
                  <p className="text-xs text-white/40 mt-1">Use your KLU email — no password needed</p>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input type="email" placeholder="you@kluniversity.in"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 text-white placeholder:text-white/20"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value.trim())}
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSendLink()}
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input type="tel" placeholder="Mobile Number (10 digits)"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 text-white placeholder:text-white/20"
                      value={phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSendLink()}
                    />
                  </div>
                  {error && <ErrorBox message={error} />}
                  <ClayButton onClick={handleSendLink} className="w-full h-14" disabled={loading || !email || !phone}>
                    {loading ? 'Sending...' : 'Send Magic Link'}
                  </ClayButton>
                </div>
                <button onClick={() => setStep('merchant_code')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 text-white/30 hover:border-emerald-500/40 hover:text-emerald-400/70 transition-all text-xs font-black uppercase tracking-widest">
                  <Store className="w-4 h-4" /> Merchant Login
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </GlassCard>

        {/* Skip */}
        {step === 'form' && (
          <div className="text-center">
            <button onClick={onSkip}
              className="group inline-flex items-center gap-2 text-white/40 hover:text-white transition-all font-bold text-sm">
              Skip for now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Dev / Admin Login */}
        {step === 'form' && (
          <div className="pt-2">
            <button onClick={openDevModal}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-[20px] border border-dashed border-white/10 text-white/20 hover:border-amber-500/40 hover:text-amber-400/60 transition-all group">
              <Shield className="w-4 h-4 group-hover:text-amber-400 transition-colors" />
              <span className="text-xs font-black uppercase tracking-widest">Admin / Dev Login</span>
            </button>
          </div>
        )}

      </motion.div>

      {/* Dev Login Modal */}
      <AnimatePresence>
        {showDevModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={(e: React.MouseEvent) => { if (e.target === e.currentTarget) setShowDevModal(false); }}>
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm glass-frosted rounded-[32px] border border-white/10 p-8 shadow-2xl"
            >
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
                <button onClick={() => setShowDevModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {devStep === 'pin' && (
                  <motion.div key="pin" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                    <div className="relative">
                      <input ref={pinRef} type={showPin ? 'text' : 'password'} placeholder="Enter dev PIN"
                        value={pin}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPin(e.target.value); setPinError(''); }}
                        onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handlePinSubmit()}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 pr-12 text-lg font-black tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-white placeholder:text-white/20 placeholder:tracking-normal"
                      />
                      <button onClick={() => setShowPin((v: boolean) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {pinError && <ErrorBox message={pinError} />}
                    <ClayButton onClick={handlePinSubmit} className="w-full h-14" disabled={!pin}>Verify PIN →</ClayButton>
                  </motion.div>
                )}

                {devStep === 'role' && (
                  <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                    {devLoading ? (
                      <div className="flex flex-col items-center gap-3 py-8">
                        <Loader2 className="w-8 h-8 text-klu-red animate-spin" />
                        <p className="text-white/40 text-sm font-bold">Logging in...</p>
                      </div>
                    ) : (
                      ROLES.map(({ role, label, desc, icon: Icon, color, bg }) => (
                        <button key={role} onClick={() => handleRoleSelect(role)}
                          className={cn('w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98]', bg)}>
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 flex-shrink-0', color)}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className={cn('font-black text-sm', color)}>{label}</p>
                            <p className="text-white/30 text-xs mt-0.5">{desc}</p>
                          </div>
                          <ArrowRight className={cn('w-4 h-4 ml-auto flex-shrink-0', color)} />
                        </button>
                      ))
                    )}
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

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
    <AlertCircle className="w-4 h-4 shrink-0" />
    {message}
  </div>
);
