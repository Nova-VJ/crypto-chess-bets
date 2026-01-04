import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import GameCard from '@/components/GameCard';
import CreateGameModal from '@/components/CreateGameModal';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Game {
  id: string;
  creator: string;
  stake: number;
  currency: string;
  timeControl: string;
  status: 'waiting' | 'playing' | 'finished';
}

const Lobby = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [games] = useState<Game[]>([
    { id: '1', creator: '0x1234...5678', stake: 0.05, currency: 'ETH', timeControl: '10+0', status: 'waiting' },
    { id: '2', creator: '0xabcd...ef01', stake: 100, currency: 'USDC', timeControl: '5+0', status: 'waiting' },
    { id: '3', creator: '0x9876...5432', stake: 0.1, currency: 'ETH', timeControl: '3+0', status: 'playing' },
    { id: '4', creator: '0xfedc...ba98', stake: 50, currency: 'USDT', timeControl: '15+10', status: 'waiting' },
    { id: '5', creator: '0x2468...1357', stake: 0.02, currency: 'ETH', timeControl: '1+0', status: 'finished' },
  ]);

  const handleCreateGame = (stake: number, currency: string, timeControl: string) => {
    console.log('Creating game:', { stake, currency, timeControl });
  };

  const handleJoinGame = (gameId: string) => {
    toast.success('Uniéndote a la partida...');
    navigate('/play');
  };

  const filteredGames = games.filter(
    (game) =>
      game.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.currency.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const waitingGames = filteredGames.filter((g) => g.status === 'waiting');
  const activeGames = filteredGames.filter((g) => g.status === 'playing');

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <AppHeader />

      <main className="container mx-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-xl font-serif font-bold">
            Lobby de <span className="gradient-text">Partidas</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Encuentra una partida o crea la tuya
          </p>
        </motion.div>

        {/* Search & Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-secondary border-border text-sm"
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Create Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4"
        >
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full btn-primary-glow bg-primary h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Partida
          </Button>
        </motion.div>

        {/* Waiting Games */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Disponibles ({waitingGames.length})
          </h2>
          {waitingGames.length > 0 ? (
            <div className="space-y-3">
              {waitingGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <GameCard {...game} onJoin={() => handleJoinGame(game.id)} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No hay partidas disponibles
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
                className="bg-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear partida
              </Button>
            </div>
          )}
        </motion.section>

        {/* Active Games */}
        {activeGames.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              En Curso ({activeGames.length})
            </h2>
            <div className="space-y-3">
              {activeGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <GameCard {...game} onWatch={() => {}} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </main>

      <CreateGameModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreateGame={handleCreateGame}
      />

      <BottomNav />
    </div>
  );
};

export default Lobby;
