import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ArrowLeft, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { SupportTicket } from '../types';

const FORMSPREE_URL = 'https://formspree.io/f/mrbgjadj';

const SUBJECTS = [
  'Payment Failed',
  'Order Not Received',
  'Wrong Amount Charged',
  'K-Coins Not Credited',
  'App Bug / Error',
  'Merchant Issue',
  'Refund Request',
  'Other',
];

interface SupportViewProps {
  tickets: SupportTicket[];
  onSubmitTicket: (subject: string, message: string) => Promise<void>;
  onBack?: () => void;
  userEmail?: string;
  userName?: string;
}

export const SupportView: React.FC<SupportViewProps> = ({ tickets, onSubmitTicket, onBack, userEmail = '', userName = '' }) => {
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const finalSubject = subject === 'Other' ? customSubject : subject;

  const handleSubmit = async () => {
    if (!finalSubject.trim() || !message.trim()) {
      setError('Please fill in both subject and message.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      // 1. POST to Formspree so you receive the email
      const formData = new FormData();
      formData.append('email', userEmail || 'anonymous@kl.one');
      formData.append('name', userName || 'KL ONE User');
      formData.append('subject', finalSubject);
      formData.append('message', message);
      formData.append('_subject', `[KL ONE Support] ${finalSubject}`);

      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error || 'Formspree submission failed');
      }

      // 2. Also save to Supabase DB (best-effort — don't block on failure)
      onSubmitTicket(finalSubject, message).catch(() => {});

      setSubmitted(true);
      setSubject('');
      setCustomSubject('');
      setMessage('');
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="w-10 h-10 rounded-2xl glass-frosted flex items-center justify-center text-white/40 hover:text-white transition-all flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-display text-4xl font-black">Support</h2>
      </div>

      {/* Submit form */}
      <GlassCard className="p-5 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Report an Issue</p>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="font-black text-emerald-400">Ticket Submitted</p>
              <p className="text-white/40 text-xs">We'll get back to you soon.</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* Subject picker */}
              <div>
                <p className="text-[10px] font-black uppercase text-white/30 mb-2">Subject</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => setSubject(s)}
                      className={cn('px-3 py-2.5 rounded-xl border text-xs font-black text-left transition-all',
                        subject === s ? 'bg-klu-red border-klu-red text-white' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20')}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {subject === 'Other' && (
                <input value={customSubject} onChange={e => setCustomSubject(e.target.value)}
                  placeholder="Describe the subject..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-white/20 outline-none focus:border-klu-red/50" />
              )}

              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Describe your issue in detail — include order ID, amount, time, etc."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-white/20 outline-none focus:border-klu-red/50 resize-none" />

              {error && (
                <p className="text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
              )}

              <ClayButton onClick={handleSubmit} disabled={isSubmitting || !finalSubject.trim() || !message.trim()} className="w-full">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Submit Ticket'}
              </ClayButton>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Past tickets */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Your Tickets</p>
        {tickets.length === 0 ? (
          <div className="text-center py-12 glass-frosted rounded-[32px] border border-white/10">
            <HelpCircle className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 font-medium">No tickets yet</p>
          </div>
        ) : tickets.map(ticket => {
          const isExp = expanded === ticket.id;
          return (
            <button key={ticket.id} onClick={() => setExpanded(isExp ? null : ticket.id)}
              className="w-full glass-frosted rounded-2xl border border-white/10 p-4 text-left hover:border-white/20 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm truncate">{ticket.subject}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {ticket.createdAt ? new Date(ticket.createdAt?.toDate ? ticket.createdAt.toDate() : ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Just now'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase border',
                    ticket.status === 'open' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-white/5 text-white/30 border-white/10')}>
                    {ticket.status}
                  </span>
                  {isExp ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
                </div>
              </div>
              <AnimatePresence>
                {isExp && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <p className="mt-3 pt-3 border-t border-white/5 text-xs text-white/40 leading-relaxed">{ticket.message}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
