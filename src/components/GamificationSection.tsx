import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, BookOpen, Star, Brain, History, ChevronRight, Zap, Award, Flame, Medal, Crown, Sword } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RankIcon from './RankIcon';
import { coachApiUrl } from '@/lib/coachApi';
import { useAuth } from '@/contexts/AuthContext';

interface GamificationData {
  level: number;
  xp: number;
  xp_to_next: number;
  rank: string;
  achievement_points: number;
  streak: number;
  achievements: any[];
  missions: {
    daily: any[];
    weekly: any[];
  };
  masteries: Record<string, number>;
}

const API_URL = coachApiUrl('/api');

const GamificationSection = ({ userId }: { userId: string }) => {
  const { session } = useAuth();
  const [data, setData] = useState<GamificationData | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'achievements' | 'missions' | 'academy'>('summary');

  useEffect(() => {
    const fetchGamification = async () => {
      if (!session?.access_token) return;

      try {
        const headers = { 'Authorization': `Bearer ${session.access_token}` };

        const res = await fetch(`${API_URL}/user/progress`, { headers });
        const progress = await res.json();
        
        const summaryRes = await fetch(`${API_URL}/gamification/summary`, { headers });
        const summary = await summaryRes.json();
        
        setData({ ...progress, ...summary });
      } catch (e) {
        console.error(e);
      }
    };
    fetchGamification();
  }, [session?.access_token, userId]);

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-[url('/brain/2fe9ede1-284d-4653-94b2-7ee1ce1fd2cf/chess_gamification_bg_1773118276309.png')] bg-cover bg-center opacity-10 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
             <div className="absolute -inset-4 bg-yellow-500/20 blur-2xl rounded-full" />
             <RankIcon rank={data.rank} size="xl" />
             <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-lg shadow-lg">
                NIVEL {data.level}
             </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">
              {data.rank}
            </h2>
            <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
               <div className="flex items-center gap-1.5 text-zinc-400">
                  <Award className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-xs font-bold">{data.achievement_points} AP</span>
               </div>
               <div className="flex items-center gap-1.5 text-zinc-400">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-bold">Racha: {data.streak} Días</span>
               </div>
            </div>
            
            <div className="space-y-2">
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <span>Progreso de Experiencia</span>
                  <span>{data.xp % 1000} / 1000 XP</span>
               </div>
               <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.xp % 1000) / 10}%` }}
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                  />
               </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900/60 border border-white/5 rounded-2xl">
         {[
           { id: 'summary', icon: Zap, label: 'Resumen' },
           { id: 'missions', icon: Target, label: 'Misiones' },
           { id: 'achievements', icon: Trophy, label: 'Logros' },
           { id: 'academy', icon: BookOpen, label: 'Academia' },
         ].map((tab) => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
               activeTab === tab.id 
                 ? 'bg-white/10 text-white shadow-lg' 
                 : 'text-zinc-500 hover:text-zinc-300'
             }`}
           >
             <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-yellow-500' : ''}`} />
             {tab.label}
           </button>
         ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Quick Missions */}
               <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xs font-black text-white uppercase tracking-widest">Misiones Diarias</h3>
                     <Target className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="space-y-3">
                     {[
                       { title: 'Duelo Maestro', desc: 'Juega 1 partida contra un GM', progress: 0, total: 1 },
                       { title: 'Táctico Experto', desc: 'Resuelve 5 análisis post-partida', progress: 2, total: 5 },
                     ].map((m, i) => (
                       <div key={i} className="bg-zinc-800/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                             <Zap className="w-5 h-5 text-orange-500" />
                          </div>
                          <div className="flex-1">
                             <p className="text-[11px] font-bold text-white mb-0.5">{m.title}</p>
                             <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden mt-1.5">
                                <div className="h-full bg-orange-500" style={{ width: `${(m.progress/m.total)*100}%` }} />
                             </div>
                          </div>
                          <span className="text-[9px] font-mono text-zinc-500">{m.progress}/{m.total}</span>
                       </div>
                     ))}
                  </div>
               </div>

               {/* Masteries */}
               <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xs font-black text-white uppercase tracking-widest">Maestrías</h3>
                     <Brain className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     {[
                       { label: 'Aperturas', icon: History, lvl: 3, color: 'text-blue-400' },
                       { label: 'Táctica', icon: Zap, lvl: 8, color: 'text-yellow-500' },
                       { label: 'Finales', icon: Target, lvl: 5, color: 'text-emerald-400' },
                       { label: 'Historia', icon: BookOpen, lvl: 2, color: 'text-purple-400' },
                     ].map((m, i) => (
                       <div key={i} className="bg-zinc-800/40 border border-white/5 p-3 rounded-2xl text-center">
                          <m.icon className={`w-5 h-5 mx-auto mb-2 ${m.color}`} />
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{m.label}</p>
                          <p className="text-sm font-black text-white leading-none">Lvl {m.lvl}</p>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'academy' && (
            <div className="space-y-6">
               <div className="relative overflow-hidden rounded-[40px] border border-white/10 h-64 flex items-center p-10 bg-black shadow-2xl">
                  <div className="absolute inset-0 bg-[url('/coaches/pattern.png')] opacity-20" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
                  <div className="relative z-20 max-w-md">
                     <div className="flex items-center gap-2 mb-4">
                        <div className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-[9px] font-black text-yellow-500 uppercase tracking-widest">Academia Real</div>
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                     </div>
                     <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-3 leading-none">Cátedras de la Historia</h2>
                     <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-medium">Estudia los momentos que definieron el ajedrez moderno. Domina la teoría de los grandes maestros y desbloquea el rango de <span className="text-white">Inmortal</span>.</p>
                     <Button className="bg-white text-black text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-2xl shadow-xl hover:scale-105 transition-transform active:scale-95">Continuar Cronología</Button>
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-40">
                    <div className="absolute inset-0 bg-gradient-to-l from-black to-transparent z-10" />
                    <img src="/coaches/pattern.png" className="w-full h-full object-cover grayscale" />
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { 
                      title: 'La Partida Inmortal (1851)', 
                      desc: 'Adolf Anderssen sacrifica ambas torres y su dama para dar un mate legendario contra Kieseritzky en Londres.', 
                      tag: 'Era de Oro',
                      reward: 500,
                      locked: false 
                    },
                    { 
                      title: 'El Match del Siglo (1972)', 
                      desc: 'Bobby Fischer rompe la hegemonía soviética en plena Guerra Fría. El asalto psicológico definitivo.', 
                      tag: 'Guerra Fría',
                      reward: 1000,
                      locked: false 
                    },
                    { 
                      title: 'El Mago de Riga', 
                      desc: 'Explora los sacrificios intuitivos de Mikhail Tal. "Debes llevar a tu oponente a un bosque profundo..."', 
                      tag: 'Ataque Romántico',
                      reward: 750,
                      locked: true 
                    },
                    { 
                      title: 'La Máquina Humana', 
                      desc: 'Jose Raúl Capablanca y la perfección técnica. La simplicidad como la máxima sofisticación.', 
                      tag: 'Clasicismo',
                      reward: 800,
                      locked: true 
                    },
                  ].map((lesson, i) => (
                    <div key={i} className={`glass-card p-6 relative overflow-hidden group border-white/5 hover:border-white/20 transition-all ${lesson.locked ? 'opacity-40 grayscale' : 'cursor-pointer hover:bg-white/5'}`}>
                       <div className="flex justify-between items-start mb-4">
                          <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{lesson.tag}</div>
                          {lesson.locked ? <Crown className="w-4 h-4 text-zinc-700" /> : <ChevronRight className="w-4 h-4 text-yellow-500 group-hover:translate-x-1 transition-transform" />}
                       </div>
                       <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">{lesson.title}</h4>
                       <p className="text-[10px] text-zinc-500 leading-relaxed mb-6 font-medium pr-8">{lesson.desc}</p>
                       <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                             <Zap className="w-3 h-3 text-yellow-500" />
                             <span className="text-[9px] font-black text-zinc-400">+{lesson.reward} XP</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <Star className="w-3 h-3 text-blue-400" />
                             <span className="text-[9px] font-black text-zinc-400">50 AP</span>
                          </div>
                       </div>
                       {lesson.locked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[2px]"><Crown className="w-10 h-10 text-zinc-800" /></div>}
                    </div>
                  ))}
               </div>
            </div>
          )}
          
          {activeTab === 'achievements' && (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: 'Primer Jaque', rarity: 'Común', icon: Zap, ap: 10, progress: 100 },
                  { title: 'Ojo de Halcón', rarity: 'Raro', icon: Brain, ap: 50, progress: 60 },
                  { title: 'Alumno de Capablanca', rarity: 'Raro', icon: Medal, ap: 50, progress: 80 },
                  { title: 'Match del Siglo', rarity: 'Épico', icon: Trophy, ap: 100, progress: 30 },
                  { title: 'Teórico Experto', rarity: 'Épico', icon: Target, ap: 100, progress: 10 },
                  { title: 'Inmortal', rarity: 'Mítico', icon: Crown, ap: 500, progress: 5 },
                  { title: 'Terror de Maestros', rarity: 'Mítico', icon: Sword, ap: 500, progress: 20 },
                  { title: 'Disciplina de Hierro', rarity: 'Leyenda', icon: Flame, ap: 250, progress: 45 },
                ].map((a, i) => (
                  <div key={i} className="glass-card p-5 text-center group cursor-pointer hover:border-white/20 transition-all relative overflow-hidden">
                     <div className={`absolute -top-10 -right-10 w-20 h-20 blur-2xl opacity-10 rounded-full ${
                       a.rarity === 'Mítico' ? 'bg-purple-500' :
                       a.rarity === 'Épico' ? 'bg-orange-500' :
                       a.rarity === 'Legendario' ? 'bg-amber-500' : 'bg-blue-500'
                     }`} />
                     <div className={`w-14 h-14 rounded-[20px] mx-auto mb-4 flex items-center justify-center shadow-inner ${
                       a.rarity === 'Mítico' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                       a.rarity === 'Épico' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                       a.rarity === 'Raro' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                       'bg-zinc-800/50 text-zinc-500 border border-white/5'
                     }`}>
                        <a.icon className={`w-7 h-7 ${a.rarity === 'Mítico' ? 'animate-pulse' : ''}`} />
                     </div>
                     <p className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 ${
                       a.rarity === 'Mítico' ? 'text-purple-400' :
                       a.rarity === 'Épico' ? 'text-orange-400' :
                       a.rarity === 'Raro' ? 'text-blue-400' : 'text-zinc-600'
                     }`}>{a.rarity}</p>
                     <p className="text-[11px] font-black text-white mb-1 leading-tight group-hover:text-yellow-500 transition-colors uppercase tracking-tight">{a.title}</p>
                     <p className="text-[9px] font-bold text-zinc-500 mb-3">{a.ap} AP</p>
                     <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${a.progress}%` }}
                          className={`h-full ${
                            a.rarity === 'Mítico' ? 'bg-purple-500' :
                            a.rarity === 'Épico' ? 'bg-orange-500' :
                            a.rarity === 'Raro' ? 'bg-blue-500' : 'bg-zinc-700'
                          }`}
                        />
                     </div>
                  </div>
                ))}
             </div>
          )}
          
          {activeTab === 'missions' && (
            <div className="space-y-6">
                <div className="space-y-3">
                   <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Target className="w-3 h-3 text-orange-500" /> Misiones Diarias (Reinician en 12h)
                   </h3>
                   {[
                     { title: 'Victoria Histórica', desc: 'Gana una partida con Blancas.', reward: 300, icon: Medal },
                     { title: 'Ojo de Águila', desc: 'Identifica una imprecisión técnica.', reward: 150, icon: Brain },
                   ].map((m, i) => (
                     <div key={i} className="glass-card p-4 flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                           <m.icon className="w-6 h-6 text-zinc-400" />
                        </div>
                        <div className="flex-1">
                           <h4 className="text-sm font-bold text-white mb-0.5">{m.title}</h4>
                           <p className="text-xs text-zinc-500">{m.desc}</p>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                              <Zap className="w-3 h-3" /> {m.reward} XP
                           </div>
                           <Button size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest rounded-full px-4 border border-white/10 bg-transparent hover:bg-white/5">Pendiente</Button>
                        </div>
                     </div>
                   ))}
                </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GamificationSection;
