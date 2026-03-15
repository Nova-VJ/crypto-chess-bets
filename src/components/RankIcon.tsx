import { motion } from 'framer-motion';
import { 
  Shield, Crown, Star, Trophy, Sword, Zap, BookOpen, Brain, 
  Activity, Target, ShieldAlert, History, Search 
} from 'lucide-react';
import { ChessPieceSVG } from './ChessPieceSVG';

interface RankIconProps {
  rank: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const RankIcon = ({ rank = 'Principiante', size = 'md', className = '' }: RankIconProps) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const getRankConfig = () => {
    switch (rank) {
      case 'Principiante': return { type: 'pawn', pieceColor: 'white', color: 'text-zinc-600', bg: 'bg-zinc-900', border: 'border-zinc-800' };
      case 'Aprendiz': return { type: 'pawn', pieceColor: 'white', color: 'text-orange-700', bg: 'bg-orange-900/10', border: 'border-orange-900/20' };
      case 'Alumno': return { type: 'pawn', pieceColor: 'white', color: 'text-zinc-300', bg: 'bg-zinc-300/10', border: 'border-zinc-300/30' };
      case 'Iniciado': return { type: 'pawn', pieceColor: 'white', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
      case 'Jugador de Club': return { type: 'knight', pieceColor: 'white', color: 'text-zinc-600', bg: 'bg-zinc-900', border: 'border-zinc-800' };
      case 'Competidor': return { type: 'knight', pieceColor: 'white', color: 'text-orange-700', bg: 'bg-orange-900/10', border: 'border-orange-900/20' };
      case 'Táctico': return { type: 'knight', pieceColor: 'white', color: 'text-zinc-300', bg: 'bg-zinc-300/10', border: 'border-zinc-300/30' };
      case 'Estratega': return { type: 'knight', pieceColor: 'white', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
      case 'Especialista': return { type: 'bishop', pieceColor: 'white', color: 'text-zinc-600', bg: 'bg-zinc-900', border: 'border-zinc-800' };
      case 'Experto': return { type: 'bishop', pieceColor: 'white', color: 'text-zinc-300', bg: 'bg-zinc-300/10', border: 'border-zinc-300/30' };
      case 'Veterano': return { type: 'bishop', pieceColor: 'white', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
      case 'Analista': return { type: 'rook', pieceColor: 'white', color: 'text-zinc-500', bg: 'bg-zinc-900', border: 'border-zinc-700' };
      case 'Maestro de Club': return { type: 'rook', pieceColor: 'white', color: 'text-zinc-300', bg: 'bg-zinc-300/10', border: 'border-zinc-300/50' };
      case 'Candidato': return { type: 'rook', pieceColor: 'white', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50' };
      case 'Maestro': return { type: 'queen', pieceColor: 'white', color: 'text-zinc-300', bg: 'bg-zinc-300/10', border: 'border-zinc-300/50' };
      case 'Maestro Élite': return { type: 'queen', pieceColor: 'white', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50' };
      case 'Gran Maestro': return { type: 'king', pieceColor: 'white', color: 'text-zinc-300', bg: 'bg-zinc-300/10', border: 'border-zinc-300/50' };
      case 'Gran Maestro Supremo': return { type: 'king', pieceColor: 'white', color: 'text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]', bg: 'bg-yellow-500/20', border: 'border-yellow-500/70' };
      case 'Leyenda del Tablero': return { type: 'king', pieceColor: 'white', color: 'text-amber-500 animate-pulse', bg: 'bg-amber-500/20', border: 'border-amber-500/60' };
      case 'Inmortal del Ajedrez': return { type: 'king', pieceColor: 'white', color: 'text-white animate-bounce shadow-[0_0_25px_rgba(255,255,255,0.8)]', bg: 'bg-white/30', border: 'border-white/80' };
      default: return { type: 'pawn', pieceColor: 'white', color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' };
    }
  };

  const { type, pieceColor, color, bg, border } = getRankConfig();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`${sizeMap[size]} ${bg} ${border} rounded-2xl border flex items-center justify-center p-1.5 relative overflow-hidden group shadow-2xl ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-0 bg-gradient-to-tl from-black/20 to-transparent" />
      
      {/* Decorative Aura for High Ranks */}
      {(rank?.includes('Gran Maestro') || rank?.includes('Leyenda') || rank?.includes('Inmortal')) && (
        <div className="absolute inset-0 animate-pulse bg-yellow-500/5 blur-xl" />
      )}

      <ChessPieceSVG 
        type={type as any} 
        color={pieceColor as any} 
        className={`${color} w-[85%] h-[85%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] relative z-10 transition-transform duration-500 group-hover:scale-110`} 
      />
    </motion.div>
  );
};

export default RankIcon;
