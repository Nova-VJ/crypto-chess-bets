import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

interface ChessBoardProps {
  fen: string;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
  orientation?: 'white' | 'black';
  disabled?: boolean;
  isMuted?: boolean;
  gameId: string;
  lastMove?: { from: string; to: string } | null;
}

const ChessBoard = ({ 
  fen, 
  onMove, 
  orientation = 'white', 
  disabled = false,
  isMuted = false,
  lastMove: externalLastMove
}: ChessBoardProps) => {
  const [chess] = useState(new Chess(fen));
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(400);

  useEffect(() => {
    chess.load(fen);
  }, [fen]);

  // Dynamically measure container to give react-chessboard an exact pixel width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const rect = container.getBoundingClientRect();
      // Use the smaller of width/height to keep it square, fallback to width
      const size = Math.floor(Math.min(rect.width, rect.height || rect.width));
      if (size > 0) setBoardWidth(size);
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(container);

    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const playSound = (type: 'move' | 'capture' | 'check') => {
    if (isMuted) return;
    const urls = {
      move: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/standard/move-self.mp3',
      capture: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/standard/capture.mp3',
      check: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/standard/move-check.mp3',
    };
    const audio = new Audio(urls[type]);
    audio.play().catch(() => {});
  };

  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (disabled) return false;

    const moveInfo = {
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1].toLowerCase() ?? 'q',
    };

    try {
      // Validate move purely to see if we should play sound/accept drop
      const moveResult = chess.move(moveInfo);
      
      if (moveResult) {
        playSound(moveResult.captured ? 'capture' : (chess.inCheck() ? 'check' : 'move'));
        onMove(moveInfo);
        return true;
      }
    } catch (e) {
      // Invalid move
      return false;
    }
    
    return false;
  };

  return (
    <div ref={containerRef} className="w-full aspect-square relative select-none bg-[#779556]">
      <Chessboard 
        id="GameBetBoard"
        position={fen}
        onPieceDrop={handlePieceDrop}
        boardOrientation={orientation}
        arePiecesDraggable={!disabled}
        boardWidth={boardWidth}
        customDarkSquareStyle={{ backgroundColor: '#769656' }}
        customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
        animationDuration={200}
        customSquareStyles={{
          ...(externalLastMove?.from ? { [externalLastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' } } : {}),
          ...(externalLastMove?.to ? { [externalLastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' } } : {})
        }}
      />
    </div>
  );
};

export default ChessBoard;

