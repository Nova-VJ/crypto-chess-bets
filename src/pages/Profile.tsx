import { motion } from 'framer-motion';
import { User, Trophy, Coins, TrendingUp, History, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { useWallet } from '@/hooks/useWallet';

const Profile = () => {
  const { isConnected, address, balance, disconnect } = useWallet();

  const stats = [
    { label: 'Partidas', value: '47', icon: History },
    { label: 'Victorias', value: '32', icon: Trophy },
    { label: 'Ganancias', value: '1.2 ETH', icon: Coins },
    { label: 'Rating', value: '1650', icon: TrendingUp },
  ];

  const recentGames = [
    { opponent: '0xAbc...123', result: 'win', stake: 0.05, time: 'Hace 2h' },
    { opponent: '0xDef...456', result: 'loss', stake: 0.1, time: 'Hace 5h' },
    { opponent: '0xGhi...789', result: 'win', stake: 0.02, time: 'Ayer' },
  ];

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-20">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No conectado</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Conecta tu wallet para ver tu perfil
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <AppHeader />

      <main className="container mx-auto px-4 py-4">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-sm">{formatAddress(address!)}</p>
              <p className="text-xl font-bold text-primary">
                {balance ? parseFloat(balance).toFixed(4) : '0.00'} ETH
              </p>
              <p className="text-xs text-muted-foreground">Balance disponible</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          {stats.map((stat, index) => (
            <div key={stat.label} className="glass-card p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Recent Games */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden mb-4"
        >
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">Partidas Recientes</h2>
          </div>
          <div className="divide-y divide-border">
            {recentGames.map((game, index) => (
              <div key={index} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-mono">{game.opponent}</p>
                  <p className="text-[10px] text-muted-foreground">{game.time}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      game.result === 'win' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {game.result === 'win' ? '+' : '-'}{game.stake} ETH
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {game.result === 'win' ? 'Victoria' : 'Derrota'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <Button variant="outline" className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={disconnect}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Desconectar Wallet
          </Button>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
