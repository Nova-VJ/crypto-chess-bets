import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Trophy, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';

const Index = () => {
  const features = [
    {
      icon: Shield,
      title: 'Smart Contracts',
      description: 'Apuestas seguras y transparentes gracias a contratos inteligentes auditados',
    },
    {
      icon: Zap,
      title: 'Partidas Instantáneas',
      description: 'Encuentra oponentes y comienza a jugar en segundos',
    },
    {
      icon: Trophy,
      title: 'Pagos Automáticos',
      description: 'El ganador recibe automáticamente su premio al terminar la partida',
    },
    {
      icon: Coins,
      title: 'Multi-Crypto',
      description: 'Apuesta con ETH, USDC, USDT y más criptomonedas',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8"
            >
              <span className="text-primary text-sm font-medium">🔥 Nuevo</span>
              <span className="text-muted-foreground text-sm">Apuestas con Smart Contracts</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 leading-tight">
              Juega Ajedrez
              <br />
              <span className="gradient-text glow-text">Gana Crypto</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              La primera plataforma de ajedrez con apuestas en criptomonedas. 
              Compite contra jugadores de todo el mundo y gana recompensas reales.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/lobby">
                <Button size="lg" className="btn-primary-glow bg-primary text-lg px-8 py-6">
                  Comenzar a Jugar
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/play">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-primary/50">
                  Jugar Demo
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Chess Piece Decorations */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-8 mt-16 text-6xl md:text-8xl opacity-20"
          >
            {['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'].map((piece, i) => (
              <motion.span
                key={i}
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="animate-float"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {piece}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              ¿Por qué <span className="gradient-text">CryptoChess</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              La combinación perfecta entre el juego más estratégico del mundo y la tecnología blockchain
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 text-center group hover:border-primary/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-8 md:p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                ¿Listo para el Desafío?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Conecta tu wallet, encuentra un oponente y demuestra tu maestría en el tablero
              </p>
              <Link to="/lobby">
                <Button size="lg" className="btn-primary-glow bg-primary text-lg px-8">
                  Ir al Lobby
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 CryptoChess. Todos los derechos reservados.</p>
          <p className="mt-2">Construido con ♟️ y tecnología blockchain</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
