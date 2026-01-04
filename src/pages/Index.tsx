import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Trophy, Coins, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

const Index = () => {
  const features = [
    {
      icon: Shield,
      title: 'Smart Contracts',
      description: 'Apuestas seguras con contratos inteligentes',
    },
    {
      icon: Zap,
      title: 'Matchmaking',
      description: 'Encuentra oponentes de tu nivel',
    },
    {
      icon: Trophy,
      title: 'Pagos Auto',
      description: 'Gana y recibe al instante',
    },
    {
      icon: Coins,
      title: 'Multi-Crypto',
      description: 'ETH, USDC, USDT y más',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Jugadores' },
    { value: '250K', label: 'Partidas' },
    { value: '1.5K', label: 'ETH Apostado' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      <AppHeader />

      {/* Hero Section */}
      <section className="relative px-4 pt-8 pb-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4"
          >
            <Gamepad2 className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          <h1 className="text-3xl font-serif font-bold mb-3 leading-tight">
            Juega Ajedrez
            <br />
            <span className="gradient-text glow-text">Gana Crypto</span>
          </h1>

          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            La primera app de ajedrez con apuestas cripto. Compite y gana recompensas reales.
          </p>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link to="/matchmaking" className="w-full">
              <Button size="lg" className="w-full btn-primary-glow bg-primary">
                <Zap className="w-5 h-5 mr-2" />
                Jugar Ahora
              </Button>
            </Link>
            <Link to="/lobby" className="w-full">
              <Button size="lg" variant="outline" className="w-full border-primary/50">
                Ver Lobby
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Chess Pieces Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-4 mt-6 text-4xl opacity-20"
        >
          {['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'].map((piece, i) => (
            <motion.span
              key={i}
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="animate-float"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {piece}
            </motion.span>
          ))}
        </motion.div>
      </section>

      {/* Stats */}
      <section className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass-card p-3 text-center"
            >
              <p className="text-xl font-bold text-primary">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-serif font-semibold mb-3 text-center">
          ¿Por qué <span className="gradient-text">GameBet</span>?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="glass-card p-4 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
              <p className="text-[10px] text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="px-4 py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5 text-center"
        >
          <h3 className="font-serif font-semibold mb-2">¿Listo para el Desafío?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Conecta tu wallet y comienza a jugar
          </p>
          <Link to="/matchmaking">
            <Button className="btn-primary-glow bg-primary">
              Buscar Partida
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <BottomNav />
    </div>
  );
};

export default Index;
