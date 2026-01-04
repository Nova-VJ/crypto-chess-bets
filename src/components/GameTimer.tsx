import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { PieceColor } from '@/lib/chess';

interface GameTimerProps {
  initialTime: number; // in seconds
  currentTurn: PieceColor;
  playerColor: PieceColor;
  isGameActive: boolean;
}

const GameTimer = ({ initialTime, currentTurn, playerColor, isGameActive }: GameTimerProps) => {
  const [whiteTime, setWhiteTime] = useState(initialTime);
  const [blackTime, setBlackTime] = useState(initialTime);

  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      if (currentTurn === 'white') {
        setWhiteTime((prev) => Math.max(0, prev - 1));
      } else {
        setBlackTime((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurn, isGameActive]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const TimerDisplay = ({ color, time }: { color: PieceColor; time: number }) => {
    const isActive = currentTurn === color && isGameActive;
    const isLow = time < 30;

    return (
      <motion.div
        animate={{
          scale: isActive ? 1.05 : 1,
          borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
        }}
        className={`
          glass-card p-4 rounded-xl border-2 transition-colors
          ${isActive ? 'border-primary' : 'border-border'}
          ${color === playerColor ? 'order-2' : 'order-1'}
        `}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full ${
              color === 'white' ? 'bg-foreground' : 'bg-muted-foreground'
            }`}
          />
          <span className="text-sm text-muted-foreground">
            {color === 'white' ? 'Blancas' : 'Negras'}
          </span>
        </div>
        <div
          className={`text-3xl font-mono font-bold mt-2 ${
            isLow && isActive ? 'text-destructive animate-pulse' : ''
          }`}
        >
          <Clock className="inline w-5 h-5 mr-2 opacity-50" />
          {formatTime(time)}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <TimerDisplay color="black" time={blackTime} />
      <TimerDisplay color="white" time={whiteTime} />
    </div>
  );
};

export default GameTimer;
