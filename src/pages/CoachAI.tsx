import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import AICoach from '@/components/AICoach';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Swords, ArrowLeft } from 'lucide-react';

const CoachAI = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <AppHeader />

      <div className="container mx-auto px-4 pt-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/profile')}
          className="text-zinc-500 hover:text-white pl-0 mb-4 transition-colors group flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-bold uppercase tracking-widest">Volver al Perfil</span>
        </Button>
      </div>

      <main className="container mx-auto px-4 py-4">
        {/* Play Historical Match CTA */}
        <div className="mb-6 p-1 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-yellow-500/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-yellow-500/10 blur-xl group-hover:bg-yellow-500/20 transition-all duration-500" />
          <div className="relative bg-zinc-950/80 backdrop-blur-sm p-4 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 flex items-center gap-2">
                <Swords className="w-5 h-5 text-yellow-500" />
                Duelo Histórico
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Juega contra las mentes de Fischer, Tal y Kasparov en tiempo real.</p>
            </div>
            <Button 
              onClick={() => navigate('/historical-play')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold whitespace-nowrap"
            >
              Jugar vs Leyenda
            </Button>
          </div>
        </div>

        <AICoach profile={profile} />
      </main>

      <BottomNav />
    </div>
  );
};

export default CoachAI;
