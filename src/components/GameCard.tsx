import { motion } from 'framer-motion';
import { Users, Clock, Coins, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GameCardProps {
  id: string;
  creator: string;
  stake: number;
  currency: string;
  timeControl: string;
  status: 'waiting' | 'playing' | 'finished';
  onJoin?: () => void;
  onWatch?: () => void;
  onCancel?: () => void;
}

const GameCard = ({
  creator,
  stake,
  currency,
  timeControl,
  status,
  onJoin,
  onWatch,
  onCancel,
}: GameCardProps) => {
  const statusColors = {
    waiting: 'bg-success/20 text-success border-success/30',
    playing: 'bg-primary/20 text-primary border-primary/30',
    finished: 'bg-muted text-muted-foreground border-muted',
  };

  const statusLabels = {
    waiting: 'Esperando',
    playing: 'En juego',
    finished: 'Finalizado',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="glass-card p-5 hover:border-primary/50 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{creator}</p>
            <p className="text-sm text-muted-foreground font-mono">Creador</p>
          </div>
        </div>
        <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">
            {stake} {currency}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 text-primary" />
          <span>{timeControl}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {status === 'waiting' && (
          <>
            {onCancel ? (
              <Button onClick={onCancel} variant="destructive" className="flex-1 w-full pulse-animation">
                Cancelar Partida
              </Button>
            ) : (
              <Button onClick={onJoin} className="flex-1 bg-primary hover:bg-primary/90">
                <Users className="w-4 h-4 mr-2" />
                Unirse
              </Button>
            )}
          </>
        )}
        {status === 'playing' && (
          <Button onClick={onWatch} variant="outline" className="flex-1">
            Ver partida
          </Button>
        )}
        {status === 'finished' && (
          <Button variant="outline" className="flex-1" disabled>
            Partida terminada
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default GameCard;
