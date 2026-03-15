import { motion } from 'framer-motion';
import { Trophy, Medal, TrendingUp, Coins } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

interface Player {
  rank: number;
  address: string;
  wins: number;
  losses: number;
  earnings: number;
  rating: number;
}

const Rankings = () => {
  const players: Player[] = [
    { rank: 1, address: '0xGM...King', wins: 156, losses: 23, earnings: 12.5, rating: 2150 },
    { rank: 2, address: '0xChess...Pro', wins: 142, losses: 31, earnings: 8.7, rating: 2080 },
    { rank: 3, address: '0xMaster...X', wins: 128, losses: 28, earnings: 7.2, rating: 2020 },
    { rank: 4, address: '0xBlitz...99', wins: 115, losses: 42, earnings: 5.8, rating: 1950 },
    { rank: 5, address: '0xCrypto...GM', wins: 98, losses: 35, earnings: 4.5, rating: 1890 },
    { rank: 6, address: '0xEth...Pawn', wins: 89, losses: 45, earnings: 3.2, rating: 1820 },
    { rank: 7, address: '0xDeFi...Rook', wins: 76, losses: 38, earnings: 2.8, rating: 1780 },
    { rank: 8, address: '0xNFT...Queen', wins: 67, losses: 42, earnings: 2.1, rating: 1720 },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <AppHeader />

      <main className="container mx-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center"
        >
          <h1 className="text-xl font-serif font-bold">
            <span className="gradient-text">Rankings</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Los mejores jugadores de GameBet
          </p>
        </motion.div>

        {/* Top 3 Podium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center items-end gap-2 mb-6"
        >
          {[players[1], players[0], players[2]].map((player, i) => {
            const heights = ['h-20', 'h-28', 'h-16'];
            const order = [1, 0, 2];
            return (
              <div
                key={player.rank}
                className={`flex flex-col items-center ${i === 1 ? 'order-2' : i === 0 ? 'order-1' : 'order-3'}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-1">
                  {getRankIcon(player.rank)}
                </div>
                <p className="text-[10px] font-mono mb-1 truncate max-w-[60px]">
                  {player.address}
                </p>
                <div
                  className={`w-16 ${heights[order[i]]} bg-gradient-to-t from-primary/20 to-primary/40 rounded-t-lg flex items-end justify-center pb-2`}
                >
                  <span className="text-xs font-bold">{player.rating}</span>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          <div className="glass-card p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold">2.4K</p>
              <p className="text-[10px] text-muted-foreground">Partidas hoy</p>
            </div>
          </div>
          <div className="glass-card p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">156 BNB</p>
              <p className="text-[10px] text-muted-foreground">Apostado hoy</p>
            </div>
          </div>
        </motion.div>

        {/* Full Leaderboard */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">Clasificación</h2>
          </div>
          <div className="divide-y divide-border">
            {players.map((player, index) => (
              <motion.div
                key={player.rank}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(player.rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate">{player.address}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {player.wins}W - {player.losses}L
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{player.rating}</p>
                  <p className="text-[10px] text-success">+{player.earnings} BNB</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Rankings;
