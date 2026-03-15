import { motion } from 'framer-motion';
import { BookOpen, ShieldCheck, Clock, Trophy, AlertTriangle, Scale } from 'lucide-react';
import Header from '@/components/Header';

const Rules = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white">Reglas y Términos</h1>
            <p className="text-zinc-400 text-lg">Lineamientos para una experiencia justa y competitiva en GameBet 1vs1.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <section className="glass-card p-6 space-y-4 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3 text-primary">
                <Clock className="w-6 h-6" />
                <h2 className="text-xl font-bold">Estructura de la Partida</h2>
              </div>
              <ul className="space-y-2 text-sm text-zinc-300 list-disc pl-5">
                <li>Partidas 1vs1 con apuestas en BNB o USDT.</li>
                <li>Controles de tiempo: 3+0 (Blitz), 5+0 (Rápida), 10+0 (Clásica).</li>
                <li>Sin incremento por movimiento para mantener la intensidad.</li>
                <li>El color de las piezas se asigna de forma aleatoria al iniciar.</li>
              </ul>
            </section>

            <section className="glass-card p-6 space-y-4 border-accent/20 bg-accent/5">
              <div className="flex items-center gap-3 text-accent">
                <Trophy className="w-6 h-6" />
                <h2 className="text-xl font-bold">Puntuación y Victoria</h2>
              </div>
              <ul className="space-y-2 text-sm text-zinc-300 list-disc pl-5">
                <li>El primer jugador en lograr jaque mate gana la partida.</li>
                <li>El ganador recibe el 95% del pozo total (apuesta propia + oponente).</li>
                <li>Se aplica un 5% de comisión de plataforma para mantenimiento.</li>
                <li>En caso de tablas (empate), las apuestas se devuelven equitativamente.</li>
              </ul>
            </section>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-success" />
              Juego Limpio (Anti-Cheating)
            </h2>
            <div className="glass-card p-8 space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Prohibición de Motores</h3>
                  <p className="text-zinc-400 text-sm">El uso de Stockfish u otros motores de ajedrez está estrictamente prohibido. Contamos con algoritmos de detección de precisión sobre-humana.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Anulación de Partida</h3>
                  <p className="text-zinc-400 text-sm">Si un jugador no realiza su primer movimiento antes de los 3 minutos, la partida se anula automáticamente y los fondos se devuelven.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Scale className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Disputas de Red</h3>
                  <p className="text-zinc-400 text-sm">GameBet no se hace responsable por pérdidas de conexión. Asegúrate de tener una conexión estable antes de apostar.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 text-center">
            <p className="text-zinc-500 text-xs italic">
              Al participar en cualquier desafío de GameBet, aceptas estos términos de uso. 
              Nos reservamos el derecho de suspender cuentas por comportamiento fraudulento.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Rules;
