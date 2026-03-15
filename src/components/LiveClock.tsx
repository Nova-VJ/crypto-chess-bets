import { useState, useEffect } from 'react';

interface LiveClockProps {
  initialTimeMs: number;
  lastMoveAt: string | null;
  isActive: boolean;
  onTimeout?: () => void;
}

const LiveClock = ({ initialTimeMs, lastMoveAt, isActive, onTimeout }: LiveClockProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeMs);

  useEffect(() => {
    if (!isActive || !lastMoveAt) {
      setTimeLeft(initialTimeMs);
      return;
    }

    const calculateTime = () => {
      const startTime = new Date(lastMoveAt).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, initialTimeMs - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0 && onTimeout) {
        onTimeout();
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 100);
    return () => clearInterval(interval);
  }, [initialTimeMs, lastMoveAt, isActive]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes === 0 && totalSeconds < 10) {
      // Show tenths of a second when under 10s
      const tenths = Math.floor((ms % 1000) / 100);
      return `0:0${seconds}.${tenths}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <span className="font-mono tabular-nums">
      {formatTime(timeLeft)}
    </span>
  );
};

export default LiveClock;
