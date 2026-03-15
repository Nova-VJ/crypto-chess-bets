import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Star } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: 'xp' | 'achievement' | 'mission';
  value: string | number;
  label: string;
}

const XPNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Listen for custom events to trigger notifications
  useEffect(() => {
    const handleNotify = (event: any) => {
      const { type, value, label } = event.detail;
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, type, value, label }]);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 4000);
    };

    window.addEventListener('gamification-notify', handleNotify);
    return () => window.removeEventListener('gamification-notify', handleNotify);
  }, []);

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none space-y-3">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="bg-black/80 backdrop-blur-xl border border-yellow-500/30 px-6 py-4 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center gap-4 min-w-[280px]"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              n.type === 'xp' ? 'bg-blue-500/20 text-blue-400' : 
              n.type === 'achievement' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {n.type === 'xp' ? <Zap className="w-6 h-6" /> : 
               n.type === 'achievement' ? <Trophy className="w-6 h-6" /> : <Star className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{n.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white">+{n.value}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">{n.type === 'xp' ? 'XP' : ''}</span>
              </div>
            </div>
            
            {/* Visual Flair */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 3.5, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1 bg-yellow-500/20 rounded-full"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Helper function to trigger notifications from anywhere
export const triggerNotification = (detail: Omit<Notification, 'id'>) => {
  window.dispatchEvent(new CustomEvent('gamification-notify', { detail }));
};

export default XPNotification;
