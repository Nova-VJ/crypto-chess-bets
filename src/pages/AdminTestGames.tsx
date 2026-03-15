import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldAlert, Gamepad2, Send, History, MessageSquare, Volume2, VolumeX, RotateCcw, Flag, Trophy, Smile, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppHeader from '@/components/AppHeader';
import ChessBoard from '@/components/ChessBoard';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { PieceColor } from '@/lib/chess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Chess } from 'chess.js';
import LiveClock from '@/components/LiveClock';

const COMMON_EMOJIS = ['😂', '😎', '😡', '🤔', '😅', '🔥', '💀', '🎯', '🤝', '👋', '👀', '♟️'];

const AdminTestGames = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'moves'>('moves');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [gameBase] = useState(new Chess());
  const [history, setHistory] = useState<any[]>([]);
  const [whiteTimeMs, setWhiteTimeMs] = useState(5 * 60 * 1000); // 5 min
  const [blackTimeMs, setBlackTimeMs] = useState(5 * 60 * 1000); // 5 min
  const [lastMoveAt, setLastMoveAt] = useState<string | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  
  // Use a fixed test ID for the simulator chat
  const gameId = 'admin-simulator-session-1';

  const handleMove = (move: any) => {
    try {
      const result = gameBase.move(move);
      if (result) {
        setFen(gameBase.fen());
        setHistory(gameBase.history({ verbose: true }));
        
        const now = Date.now();
        if (lastMoveAt) {
          const elapsed = now - new Date(lastMoveAt).getTime();
          if (turn === 'w') setWhiteTimeMs(prev => Math.max(0, prev - elapsed));
          else setBlackTimeMs(prev => Math.max(0, prev - elapsed));
        }
        
        setTurn(gameBase.turn());
        setLastMoveAt(new Date(now).toISOString());

        if (gameBase.isCheckmate()) {
          handleGameEnd(gameBase.turn() === 'w' ? 'black' : 'white');
        } else if (gameBase.isDraw() || gameBase.isStalemate() || gameBase.isThreefoldRepetition()) {
          toast('Empate', { icon: '🤝' });
        }
      }
    } catch(e) { /* ignore invalid moves */ }
  };

  const handleGameEnd = (winner: PieceColor) => {
    setWinner(winner);
    toast.success(`¡Jaque Mate! Ganan las ${winner === 'white' ? 'Blancas' : 'Negras'}`);
  };

  useEffect(() => {
    // Simulator uses local chat to bypass RLS on non-existent game IDs
    setMessages([
      { user_id: 'system', content: 'Bienvenido al simulador de partidas. El chat aquí es local.' }
    ]);
  }, []);

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !user) return;
    
    setMessages(prev => [
      ...prev, 
      { user_id: user.id, content: chatMessage.trim() }
    ]);
    
    setChatMessage('');
  };

  return (
    <div className="h-screen bg-[#161512] text-zinc-300 overflow-hidden flex flex-col">
      <AppHeader />

      <main className="flex-1 min-h-0 container mx-auto px-4 pt-16 pb-2">
        <div className="flex flex-col lg:flex-row gap-3 h-full max-w-[1200px] mx-auto">
          
          {/* Main Content Area - Board */}
          <div className="w-full lg:flex-1 shrink-0 flex flex-col h-full min-h-0 overflow-hidden">
            {/* Title - fixed height */}
            <div className="shrink-0 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-bold font-serif">Simulador Admin</h1>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Salir
              </Button>
            </div>

            {/* Opponent Info (Simulator Black) - fixed height */}
            <div className="shrink-0 flex items-center justify-between bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/50 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700 flex items-center justify-center font-bold text-zinc-500 text-xs">
                  B
                </div>
                <div>
                  <div className="text-white font-bold text-xs flex items-center gap-2">Bot de Pruebas</div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Negras</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-lg font-mono text-lg font-bold min-w-[80px] text-center ${turn === 'b' ? 'bg-white text-black' : 'bg-black/40 text-zinc-500 border border-zinc-800'}`}>
                <LiveClock 
                  initialTimeMs={blackTimeMs}
                  lastMoveAt={lastMoveAt}
                  isActive={turn === 'b' && !winner}
                  onTimeout={() => handleGameEnd('white')}
                />
              </div>
            </div>

            {/* Board - fills remaining space, constrained to fit viewport */}
            <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
              <div className="shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded overflow-hidden bg-[#769656]" style={{ height: '100%', maxHeight: '100%', aspectRatio: '1/1' }}>
                <ChessBoard
                  fen={fen}
                  onMove={handleMove}
                  orientation="white"
                  disabled={!!winner}
                  gameId={gameId}
                />
              </div>
            </div>

            {/* My Info (Simulator White) - fixed height */}
            <div className="shrink-0 flex items-center justify-between bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/50 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700 flex items-center justify-center font-bold text-zinc-500 text-xs">
                  W
                </div>
                <div>
                  <div className="text-white font-bold text-xs flex items-center gap-2">{profile?.display_name || 'Tú'}</div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Blancas</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-lg font-mono text-lg font-bold min-w-[80px] text-center ${turn === 'w' ? 'bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' : 'bg-black/40 text-zinc-500 border border-zinc-800'}`}>
                <LiveClock 
                  initialTimeMs={whiteTimeMs}
                  lastMoveAt={lastMoveAt}
                  isActive={turn === 'w' && !winner}
                  onTimeout={() => handleGameEnd('black')}
                />
              </div>
            </div>
          </div>

          {/* Sidebar Area - Info/Chat */}
          <div className="w-full lg:w-[380px] flex flex-col gap-4 py-4">
            
            <div className="bg-[#262421] rounded-lg overflow-hidden flex flex-col flex-1 border border-zinc-800 shadow-xl">
              <div className="flex border-b border-zinc-800 bg-[#21201d]">
                <button 
                  onClick={() => setActiveTab('moves')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'moves' ? 'border-primary text-white bg-[#262421]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                >
                  <History className="w-4 h-4" /> Movimientos
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'chat' ? 'border-primary text-white bg-[#262421]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                >
                  <MessageSquare className="w-4 h-4" /> Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'moves' ? (
                  <div className="grid grid-cols-2 gap-px bg-zinc-800/50 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="bg-zinc-900/60 p-2 text-[10px] font-mono text-zinc-500 text-center border-b border-zinc-800 col-span-2 uppercase tracking-widest py-3">
                      Comienzo de la partida
                    </div>
                    {history.map((move: any, i: number) => (
                      <div key={i} className={`p-2 text-xs font-mono flex items-center gap-3 ${i % 2 === 0 ? 'bg-zinc-900/40 text-white' : 'bg-zinc-800/20 text-zinc-400'}`}>
                         <span className="text-zinc-600 w-4 text-right">{Math.floor(i/2) + 1}.</span>
                         <span className="font-bold">{move.san}</span>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <div className="col-span-2 p-4 text-center text-xs text-zinc-600 italic">Aún no hay movimientos</div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${msg.user_id === user?.id ? 'bg-primary text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-300 rounded-tl-none'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeTab === 'chat' && (
                <div className="p-3 bg-[#21201d] border-t border-zinc-800 relative">
                  <AnimatePresence>
                    {showEmojis && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl grid grid-cols-6 gap-2 z-50 w-full"
                      >
                        {COMMON_EMOJIS.map(emoji => (
                          <button 
                            key={emoji}
                            onClick={() => {
                              setChatMessage(prev => prev + emoji);
                              setShowEmojis(false);
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded text-xl transition-colors mx-auto"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex gap-2 relative">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={`shrink-0 w-9 h-9 rounded-lg ${showEmojis ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                      onClick={() => setShowEmojis(!showEmojis)}
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                    <div className="relative flex-1">
                      <Input 
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                        placeholder="Mensaje de prueba..."
                        className="bg-zinc-900 border-zinc-700 h-9 text-xs pr-10"
                      />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 text-zinc-500 hover:text-white"
                        onClick={sendChatMessage}
                      >
                         <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#262421] p-4 rounded-lg border border-zinc-800 space-y-3 shadow-xl">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 h-10" onClick={() => setIsSoundOn(!isSoundOn)}>
                  {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 h-10" onClick={() => window.location.reload()}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {winner && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#262421] border border-primary/30 p-8 text-center max-w-sm w-full rounded-2xl">
                <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-4">Ganan las {winner === 'white' ? 'Blancas' : 'Negras'}</h2>
                <Button className="w-full bg-primary" onClick={() => window.location.reload()}>Reiniciar</Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminTestGames;
