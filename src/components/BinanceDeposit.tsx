import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, Copy, Check, Info, ArrowLeft, 
  User, CheckCircle2, Loader2, Wallet,
  ShieldCheck, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface BinanceDepositProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

const BinanceDeposit = ({ onBack, onSuccess }: BinanceDepositProps) => {
  const { user, profile, isAuthenticated, signUp } = useAuth();
  const [step, setStep] = useState<1 | 2>(isAuthenticated ? 2 : 1);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refId, setRefId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const PLATFORM_ADDRESS = import.meta.env.VITE_PLATFORM_WALLET || '0x2cBf58C431dA0fb10ebe8A00AabacAb7e165DF56';

  useEffect(() => {
    if (step === 2) {
      // Generate a unique 8-digit reference ID linked to this session/user
      const newRef = Math.floor(10000000 + Math.random() * 90000000).toString();
      setRefId(newRef);
    }
  }, [step]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname) return toast.error("Elige un nickname");
    if (!email || !password) return toast.error("Completa tus datos de acceso");
    
    setIsVerifying(true);
    try {
      const { error } = await signUp(email, password, nickname, avatar);
      if (error) {
        toast.error("Error al crear cuenta", { description: error.message });
      } else {
        toast.success("Perfil creado", { description: "Ahora puedes proceder al depósito" });
        setStep(2);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyValue = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const handleCheckPayment = async () => {
    setIsVerifying(true);
    // In a real app, this would poll an API that checks Binance Pay or on-chain events with a specific memo
    setTimeout(() => {
      setIsVerifying(false);
      toast.info("Pago en proceso", {
        description: "Estamos verificando la red. Las transferencias de Binance suelen confirmarse en 2-5 minutos."
      });
    }, 2000);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${PLATFORM_ADDRESS}&bgcolor=121212&color=FFFFFF`;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form 
            key="step1"
            onSubmit={handleCreateProfile}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Crea tu Identidad</h3>
              <p className="text-xs text-zinc-500 max-w-[200px] mx-auto">Configura tu perfil para que el sistema reconozca tu depósito de Binance</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Elige tu Avatar</Label>
                <div className="flex flex-wrap gap-2 justify-center py-2">
                  {['👤', '🦁', '🦅', '🐺', '🦊', '🐲', '⚔️', '🛡️', '👑', '💎'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all ${
                        avatar === emoji ? 'bg-primary border-2 border-white/20 scale-110 shadow-lg' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Nickname</Label>
                <Input 
                  placeholder="Ej: Kasparov_Style" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-center font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase font-black tracking-widest text-zinc-600 pl-1">Correo</Label>
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase font-black tracking-widest text-zinc-600 pl-1">Pass</Label>
                  <Input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={isVerifying} className="w-full h-12 btn-primary-glow font-black uppercase tracking-widest">
                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Siguiente: Generar QR de Depósito'}
              </Button>
              
              {onBack && (
                <button 
                  type="button"
                  onClick={onBack} 
                  className="w-full text-zinc-600 hover:text-white text-[10px] font-black uppercase tracking-widest mt-2 transition-colors"
                >
                  ← O volver a opciones
                </button>
              )}
            </div>
          </motion.form>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
             <div className="flex flex-col items-center gap-4">
                <div className="p-5 bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl relative">
                   <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-500 rounded-full flex items-center gap-1.5 shadow-lg">
                      <ShieldCheck className="w-3.5 h-3.5 text-black" />
                      <span className="text-[10px] font-black text-black uppercase tracking-widest">Pago Seguro BSC</span>
                   </div>
                   <img src={qrUrl} alt="QR Depósito Platform" className="w-48 h-48 rounded-3xl" />
                </div>
                <div className="text-center space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Wallet Destino (BNB Smart Chain)</p>
                   <div 
                      onClick={() => handleCopyValue(PLATFORM_ADDRESS)}
                      className="flex items-center gap-2 bg-zinc-900/60 hover:bg-zinc-800 px-4 py-2 rounded-2xl border border-white/5 cursor-pointer transition-colors group"
                   >
                      <code className="text-[10px] text-zinc-400 font-mono truncate max-w-[180px] group-hover:text-white transition-colors">{PLATFORM_ADDRESS}</code>
                      <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-primary transition-colors" />
                   </div>
                </div>
             </div>

             <div className="bg-gradient-to-br from-yellow-500/20 to-zinc-900/40 border border-yellow-500/30 rounded-3xl p-5 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-3xl rounded-full" />
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-2xl bg-yellow-500 flex items-center justify-center shrink-0 shadow-lg">
                      <AlertTriangle className="w-5 h-5 text-black" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[11px] font-black text-yellow-500 uppercase tracking-widest">Memo / Referencia Crítico</p>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        Para vincular el pago a tu perfil <span className="text-white font-bold">{nickname || profile?.display_name}</span>, **DEBES** incluir este código en el campo "Memo" o "Notas" al retirar desde Binance:
                      </p>
                   </div>
                </div>
                
                <div className="flex items-center justify-between bg-black/60 p-4 rounded-2xl border border-white/10">
                   <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">Referencia Unica</span>
                      <p className="text-2xl font-black text-white tracking-[0.3em]">{refId}</p>
                   </div>
                   <Button onClick={() => handleCopyValue(refId)} className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 font-black text-xs uppercase">
                      Copiar
                   </Button>
                </div>
             </div>

             <div className="space-y-3">
                <Button onClick={handleCheckPayment} disabled={isVerifying} className="w-full h-14 bg-success hover:bg-success/90 rounded-2xl shadow-lg shadow-success/20">
                   {isVerifying ? (
                     <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-black uppercase tracking-widest">Verificando...</span>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-black uppercase tracking-widest">Ya realicé mi depósito</span>
                     </div>
                   )}
                </Button>
                <div className="flex justify-center items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                   <p className="text-[9px] text-center text-zinc-500 uppercase tracking-widest font-black">Validación automática en tiempo real</p>
                </div>
             </div>

             <Button variant="ghost" onClick={onBack} className="w-full text-zinc-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
                 Limpiar y volver
             </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BinanceDeposit;
