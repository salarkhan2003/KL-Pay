import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Phone, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  GoogleAuthProvider, 
  signInWithPopup,
  ConfirmationResult
} from 'firebase/auth';
import { GlassCard } from './GlassCard';
import { ClayButton } from './ClayButton';
import { cn } from '../utils';

interface LoginPageProps {
  onSkip: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSkip }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  }, []);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier);
      setConfirmationResult(result);
      setStep('otp');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send OTP');
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otp);
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError('Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-crimson-dark flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] radial-glow opacity-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] radial-glow opacity-20" />
      
      <div id="recaptcha-container"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 z-10"
      >
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-klu-red rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-[0_20px_40px_rgba(200,16,46,0.3)] border border-white/10"
          >
            <ChefHat className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-display text-5xl font-black tracking-tighter text-white">KL ONE</h1>
          <p className="text-white/40 font-medium">Campus Dining, Reimagined.</p>
        </div>

        <GlassCard className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div 
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white">Login</h2>
                  <p className="text-xs text-white/40 font-medium">Enter your mobile number to receive an OTP</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input 
                      type="tel" 
                      placeholder="Mobile Number" 
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-klu-red/50 transition-all"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <ClayButton 
                    onClick={handleSendOtp} 
                    className="w-full h-14"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </ClayButton>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-crimson-dark px-4 text-white/20">Or continue with</span></div>
                </div>

                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all group"
                >
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-1">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                  </div>
                  <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">Google Account</span>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="otp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white">Verify OTP</h2>
                  <p className="text-xs text-white/40 font-medium">Sent to +91 {phoneNumber}</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input 
                      type="text" 
                      placeholder="6-digit OTP" 
                      maxLength={6}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-klu-red/50 transition-all"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <ClayButton 
                    onClick={handleVerifyOtp} 
                    className="w-full h-14"
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </ClayButton>

                  <button 
                    onClick={() => setStep('phone')}
                    className="w-full text-xs font-bold text-white/40 hover:text-white transition-colors"
                  >
                    Change Phone Number
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        <div className="text-center">
          <button 
            onClick={onSkip}
            className="group inline-flex items-center gap-2 text-white/40 hover:text-white transition-all font-bold text-sm"
          >
            Skip for now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
