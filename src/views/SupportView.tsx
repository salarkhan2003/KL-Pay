import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ClayButton } from '../components/ClayButton';
import { cn } from '../utils';
import { SupportTicket } from '../types';

interface SupportViewProps {
  tickets: SupportTicket[];
  onSubmitTicket: (subject: string, message: string) => Promise<void>;
}

export const SupportView: React.FC<SupportViewProps> = ({ tickets, onSubmitTicket }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message) return;
    setIsSubmitting(true);
    try {
      await onSubmitTicket(subject, message);
      setSubject('');
      setMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold">Help Center</h2>
      <GlassCard className="space-y-4">
        <h3 className="font-bold">Report an Issue</h3>
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Subject (e.g. Payment Failed)" 
            className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-klu-red"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea 
            placeholder="Describe your problem..." 
            className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 text-white placeholder:text-white/20 h-32 outline-none focus:ring-2 focus:ring-klu-red"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <ClayButton 
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !subject || !message}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
          </ClayButton>
        </div>
      </GlassCard>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Your Tickets</h3>
        {tickets.length === 0 ? (
          <div className="text-center py-12 glass-frosted rounded-[32px] border border-white/5">
            <HelpCircle className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 font-medium">No tickets found</p>
          </div>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="glass-frosted p-4 rounded-2xl border border-white/10 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">{ticket.subject}</h4>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'Just now'}</p>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                ticket.status === 'open' ? "bg-blue-500/20 text-blue-500" : "bg-white/10 text-white/40"
              )}>
                {ticket.status}
              </span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};
