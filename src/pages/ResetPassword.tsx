import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Lock, Loader2, Sword } from 'lucide-react';
import { motion } from 'framer-motion';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sesión de recuperación expirada o inválida");
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("Las contraseñas no coinciden");
    }
    if (password.length < 6) {
      return toast.error("La contraseña debe tener al menos 6 caracteres");
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error("Error al actualizar la contraseña", { description: error.message });
      } else {
        toast.success("Contraseña actualizada correctamente", {
          description: "Ya puedes iniciar sesión con tu nueva contraseña"
        });
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center opacity-5 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-zinc-900/60 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
               <Lock className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">Restablecer Contraseña</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Seguridad de Maestro</p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 pl-1">Nueva Contraseña</Label>
                <div className="relative">
                  <Input 
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 h-14 rounded-2xl pl-4 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 pl-1">Confirmar Contraseña</Label>
                <Input 
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 h-14 rounded-2xl pl-4 focus:ring-primary/20"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-14 btn-primary-glow text-base font-black uppercase tracking-widest rounded-2xl">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-5 h-5" />
                   Actualizar Contraseña
                </div>
              )}
            </Button>

            <button 
              type="button"
              onClick={() => navigate('/')}
              className="w-full text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Cancelar y volver al Inicio
            </button>
          </form>
        </div>

        <div className="mt-8 flex justify-center items-center gap-4 text-white/20">
           <Sword className="w-8 h-8" />
           <div className="h-px w-20 bg-white/10" />
           <ShieldCheck className="w-8 h-8" />
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
