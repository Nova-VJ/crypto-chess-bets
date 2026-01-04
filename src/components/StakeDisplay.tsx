import { motion } from 'framer-motion';
import { Coins, Trophy, Users } from 'lucide-react';

interface StakeDisplayProps {
  stake: number;
  currency: string;
  player1: string;
  player2?: string;
}

const StakeDisplay = ({ stake, currency, player1, player2 }: StakeDisplayProps) => {
  const totalPot = stake * 2;
  const winnerPrize = totalPot * 0.95;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Pot de la Partida
        </h3>
        <div className="text-2xl font-bold gradient-text">
          {totalPot} {currency}
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-bold">♔</span>
            </div>
            <span className="text-muted-foreground">Jugador 1</span>
          </div>
          <span className="font-mono">{player1}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted-foreground flex items-center justify-center">
              <span className="text-background text-xs font-bold">♚</span>
            </div>
            <span className="text-muted-foreground">Jugador 2</span>
          </div>
          <span className="font-mono">{player2 || 'Esperando...'}</span>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coins className="w-4 h-4 text-success" />
          Premio al ganador
        </div>
        <span className="text-lg font-bold text-success">
          {winnerPrize.toFixed(4)} {currency}
        </span>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Los fondos están bloqueados en el smart contract
      </p>
    </motion.div>
  );
};

export default StakeDisplay;
