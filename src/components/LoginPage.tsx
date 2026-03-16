import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChefHat, Mail, Phone, ArrowRight, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, Shield, Eye, EyeOff,
  GraduationCap, Store, Crown, X
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailLink } from 'firebase/auth';
import { auth, isSignInWithEmailLink } from '../firebase';
import { sendMagicLink, completeMagicLink, isKluEmail, getAuthErrorMessage } from '../auth';
import { GlassCard } from './GlassCard';
import { ClayButton } from './ClayButton';
import { cn } from '../utils';

// ── Admin PIN — to change: update the string below ───────────────────────────
const DEV_PIN = 'NO PASSWORD KLU';

interface LoginPageProps {
  onSkip: () => void;
  onMagicLinkComplete: (uid: string, email: string, phone: string) => Promise<void>;
  onDevLogin: (role: 'student' | 'merchant' | 'admin') => Promise<void>;
}

type Step = 'form' | 'sent' | 'cross_device' | 'completing';
type DevStep = 'pin' | 'role';

export const LoginPage: React.FC<LoginPageProps> = ({ onSkip, onMagicLinkComplete, onDevLogin }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [crossEmail, setCrossEmail] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dev login modal state
  const [showDevModal, setShowDevModal] = useState(false);
  const [devStep, setDevStep] = useState<DevStep>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const href = window.location.href;
    if (!href.includes('oobCode')) return;
    (async () => {
      try {
        const result = await completeMagicLink(href);
        if (!result) return;
        setStep('completing');
        await onMagicLinkComplete(result.uid, result.email, result.phone);
      } catch (err: any) {
        if (err.message?.includes('Could not find your email')) {
          setStep('cross_device');
        } else {
          setError(getAuthErrorMessage(err));
          setStep('form');
        }
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
    if (!isKluEmail(crossEmail.trim())) { setError('Please use your KLU email.'); return; }
    setLoading(true); setError(null);
    try {
      if (!isSignInWithEmailLink(auth, window.location.href)) { setError('Invalid sign-in link.'); return; }
      const cred = await signInWithEmailLink(auth, crossEmail.trim(), window.location.href);
      window.history.replaceState({}, document.title, window.location.pathname);
      await onMagicLinkComplete(cred.user.uid, cred.user.email ?? crossEmail, '');
    } catch (err: any) { setError(getAuthErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true); setError(null);
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (err: any) { setError('Google sign-in failed. Try again.'); }
    finally { setLoading(false); }
  };

  // ── Dev modal handlers ──────────────────────────────────────────────────────
  const openDevModal = () => {
    setPin(''); setPinError(''); setDevStep('pin'); setShowDevModal(true);
    setTimeout(() => pinRef.current?.focus(), 100);
  };

  const handlePinSubmit = () => {
    if (pin === DEV_PIN) {
      setPinError('');
      setDevStep('role');
    } else {
      setPinError('Wrong PIN. Try again.');
      setPin('');
      setTimeout(() => pinRef.current?.focus(), 50);
    }
  };

  const handleRoleSelect = async (role: 'student' | 'merchant' | 'admin') => {
    setDevLoading(true);
    try {
      await onDevLogin(role);
      setShowDevModal(false);
    } catch {
      setPinError('Login failed. Check console.');
    } finally {
      setDevLoading(false);
    }
  };

  const ROLES = [
    {
      role: 'student' as const,
      label: 'Student',
      desc: 'Browse food, order, pay, K-Coins',
      icon: GraduationCap,
      color: 'text-klu-red',
      bg: 'bg-klu-red/10 border-klu-red/30 hover:border-klu-red/60',
      active: 'bg-klu-red/20 border-klu-red/50',
    },
    {
      role: 'merchant' as const,
      label: 'Merchant',
      desc: 'Dashboard, orders, menu, alerts',
      icon: Store,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60',
      active: 'bg-emerald-500/20 border-emerald-500/50',
    },
    {
      role: 'admin' as const,
      label: 'Admin',
      desc: 'Analytics, all orders, system tools',
      icon: Crown,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60',
      active: 'bg-amber-500/20 border-amber-500/50',
    },
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

        {/* Main auth card */}
        <GlassCard className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            {step === 'completing' && (
              <motion.div key="completing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="w-10 h-10 text-klu-red animate-spin" />
                <p className="text-white/60 font-medium text-sm">Signing you in...</p>
              </motion.div>
            )}

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

            {step === 'cross_device' && (
              <motion.div key="cross" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="text-xl font-black text-white">Confirm your email</h2>
                <p className="text-xs text-white/40">Opened on a different device? Enter your KLU email to finish.</p>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input type="email" placeholder="your@kluniversity.in"
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 text-white placeholder:text-white/20"
                    value={crossEmail} onChange={(e) => setCrossEmail(e.target.value.trim())} />
                </div>
                {error && <ErrorBox message={error} />}
                <ClayButton onClick={handleCrossDeviceSignIn} className="w-full h-14" disabled={loading}>
                  {loading ? 'Verifying...' : 'Complete Sign-In'}
                </ClayButton>
              </motion.div>
            )}

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
                      value={email} onChange={(e) => setEmail(e.target.value.trim())} />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input type="tel" placeholder="Mobile Number (10 digits)"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 text-white placeholder:text-white/20"
                      value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                  </div>
                  {error && <ErrorBox message={error} />}
                  <ClayButton onClick={handleSendLink} className="w-full h-14" disabled={loading || !email || !phone}>
                    {loading ? 'Sending...' : 'Send Magic Link'}
                  </ClayButton>
                </div>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-[10px] font-black uppercase tracking-widest text-white/20">Or</span>
                  </div>
                </div>
                <button onClick={handleGoogleSignIn} disabled={loading}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all disabled:opacity-50">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-1">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                  </div>
                  <span className="text-sm font-bold text-white/60">Continue with Google</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Skip */}
        <div className="text-center">
          <button onClick={onSkip}
            className="group inline-flex items-center gap-2 text-white/40 hover:text-white transition-all font-bold text-sm">
            Skip for now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ── Dev / Admin Login ─────────────────────────────────────────────── */}
        <div className="pt-2">
          <button onClick={openDevModal}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-[20px] border border-dashed border-white/10 text-white/20 hover:border-amber-500/40 hover:text-amber-400/60 transition-all group">
            <Shield className="w-4 h-4 group-hover:text-amber-400 transition-colors" />
            <span className="text-xs font-black uppercase tracking-widest">Admin / Dev Login</span>
          </button>
        </div>
      </motion.div>

      {/* ── Dev Login Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDevModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDevModal(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm glass-frosted rounded-[32px] border border-white/10 p-8 shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-black text-sm">Dev Access</p>
                    <p className="text-[10px] text-white/30">
                      {devStep === 'pin' ? 'Enter PIN to continue' : 'Select a role to test'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowDevModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1: PIN entry */}
                {devStep === 'pin' && (
                  <motion.div key="pin" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="space-y-4">
                    <div className="relative">
                      <input
                        ref={pinRef}
                        type={showPin ? 'text' : 'password'}
                        placeholder="Enter dev PIN"
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setPinError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 pr-12 text-lg font-black tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-white placeholder:text-white/20 placeholder:tracking-normal"
                      />
                      <button onClick={() => setShowPin(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {pinError && <ErrorBox message={pinError} />}
                    <ClayButton onClick={handlePinSubmit} className="w-full h-14" disabled={!pin}>
                      Verify PIN →
                    </ClayButton>
                  </motion.div>
                )}

                {/* Step 2: Role selection */}
                {devStep === 'role' && (
                  <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-3">
                    {devLoading ? (
                      <div className="flex flex-col items-center gap-3 py-8">
                        <Loader2 className="w-8 h-8 text-klu-red animate-spin" />
                        <p className="text-white/40 text-sm font-bold">Logging in...</p>
                      </div>
                    ) : (
                      ROLES.map(({ role, label, desc, icon: Icon, color, bg }) => (
                        <button key={role} onClick={() => handleRoleSelect(role)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98]",
                            bg
                          )}>
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 flex-shrink-0", color)}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className={cn("font-black text-sm", color)}>{label}</p>
                            <p className="text-white/30 text-xs mt-0.5">{desc}</p>
                          </div>
                          <ArrowRight className={cn("w-4 h-4 ml-auto flex-shrink-0", color)} />
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
