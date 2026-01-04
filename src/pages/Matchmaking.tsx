import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Users, Zap, Clock, Coins, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

interface MatchmakingPlayer {
  id: string;
  address: string;
  stake: number;
  rating: number;
}

const Matchmaking = () => {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [stakeAmount, setStakeAmount] = useState([0.05]);
  const [timeControl, setTimeControl] = useState('5+0');
  const [playersInQueue, setPlayersInQueue] = useState(0);
  const [foundMatch, setFoundMatch] = useState<MatchmakingPlayer | null>(null);

  const timeControls = [
    { value: '1+0', label: 'Bullet', description: '1 min' },
    { value: '3+0', label: 'Blitz', description: '3 min' },
    { value: '5+0', label: 'Blitz', description: '5 min' },
    { value: '10+0', label: 'Rápido', description: '10 min' },
    { value: '15+10', label: 'Rápido', description: '15+10' },
  ];

  const stakeRanges = [
    { min: 0.01, max: 0.05, label: 'Micro' },
    { min: 0.05, max: 0.2, label: 'Pequeño' },
    { min: 0.2, max: 0.5, label: 'Medio' },
    { min: 0.5, max: 1, label: 'Alto' },
    { min: 1, max: 5, label: 'Premium' },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
        
        // Simulate players in queue
        setPlayersInQueue(Math.floor(Math.random() * 50) + 10);
        
        // Simulate finding a match after 3-8 seconds
        if (Math.random() > 0.85 && searchTime > 2) {
          const mockPlayer: MatchmakingPlayer = {
            id: Math.random().toString(36).substr(2, 9),
            address: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
            stake: stakeAmount[0],
            rating: Math.floor(Math.random() * 800) + 1200,
          };
          setFoundMatch(mockPlayer);
          setIsSearching(false);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isSearching, searchTime, stakeAmount]);

  const startSearching = () => {
    setSearchTime(0);
    setFoundMatch(null);
    setIsSearching(true);
    toast.info('Buscando oponente...');
  };

  const cancelSearch = () => {
    setIsSearching(false);
    setSearchTime(0);
    toast.info('Búsqueda cancelada');
  };

  const acceptMatch = () => {
    toast.success('¡Partida aceptada!');
    navigate('/play');
  };

  const declineMatch = () => {
    setFoundMatch(null);
    toast.info('Partida rechazada');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <AppHeader />

      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-2xl font-serif font-bold mb-2">
            <span className="gradient-text">Matchmaking</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Encuentra oponentes de tu nivel
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {foundMatch ? (
            <motion.div
              key="match-found"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-6 text-center mb-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4"
              >
                <Users className="w-10 h-10 text-success" />
              </motion.div>
              <h2 className="text-xl font-serif font-bold mb-2 text-success">
                ¡Oponente Encontrado!
              </h2>
              <div className="glass-card p-4 mb-4">
                <p className="font-mono text-sm mb-1">{foundMatch.address}</p>
                <p className="text-muted-foreground text-sm">
                  Rating: {foundMatch.rating} • Apuesta: {foundMatch.stake} ETH
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={declineMatch}>
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button className="bg-success hover:bg-success/90" onClick={acceptMatch}>
                  <Zap className="w-4 h-4 mr-2" />
                  Aceptar
                </Button>
              </div>
            </motion.div>
          ) : isSearching ? (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-8 text-center mb-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary flex items-center justify-center mx-auto mb-4"
              >
                <Loader2 className="w-8 h-8 text-primary animate-pulse" />
              </motion.div>
              <h2 className="text-xl font-serif font-bold mb-2">
                Buscando oponente...
              </h2>
              <p className="text-3xl font-mono text-primary mb-2">
                {formatTime(searchTime)}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {playersInQueue} jugadores en cola
              </p>
              <div className="flex gap-2 justify-center text-xs text-muted-foreground mb-6">
                <span className="px-2 py-1 rounded bg-secondary">{stakeAmount[0]} ETH</span>
                <span className="px-2 py-1 rounded bg-secondary">{timeControl}</span>
              </div>
              <Button variant="outline" onClick={cancelSearch}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="config"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Stake Selection */}
              <div className="glass-card p-5 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Apuesta</h3>
                </div>
                <div className="mb-4">
                  <Slider
                    value={stakeAmount}
                    onValueChange={setStakeAmount}
                    min={0.01}
                    max={1}
                    step={0.01}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0.01 ETH</span>
                    <span className="text-primary font-semibold">
                      {stakeAmount[0].toFixed(2)} ETH
                    </span>
                    <span>1.00 ETH</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stakeRanges.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => setStakeAmount([(range.min + range.max) / 2])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        stakeAmount[0] >= range.min && stakeAmount[0] <= range.max
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Control */}
              <div className="glass-card p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Control de Tiempo</h3>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {timeControls.map((tc) => (
                    <button
                      key={tc.value}
                      onClick={() => setTimeControl(tc.value)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        timeControl === tc.value
                          ? 'bg-primary text-primary-foreground scale-105'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      <p className="text-xs font-medium">{tc.label}</p>
                      <p className={`text-[10px] ${timeControl === tc.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {tc.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Play Button */}
              <Button
                size="lg"
                className="w-full btn-primary-glow bg-primary text-lg py-6"
                onClick={startSearching}
              >
                <Zap className="w-5 h-5 mr-2" />
                Buscar Partida
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Queue Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 grid grid-cols-3 gap-3"
        >
          {[
            { label: 'En Cola', value: '127' },
            { label: 'Partidas Hoy', value: '2.4K' },
            { label: 'Apostado', value: '156 ETH' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-primary">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Matchmaking;
