import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Board,
  Square,
  Piece,
  PieceColor,
  PIECE_SYMBOLS,
  createInitialBoard,
  isValidMove,
  getValidMoves,
  makeMove,
  isKingInCheck,
  isCheckmate,
} from '@/lib/chess';

interface ChessBoardProps {
  onGameEnd?: (winner: PieceColor) => void;
  playerColor?: PieceColor;
  disabled?: boolean;
}

const ChessBoard = ({ onGameEnd, playerColor = 'white', disabled = false }: ChessBoardProps) => {
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('white');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [inCheck, setInCheck] = useState<PieceColor | null>(null);

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (disabled) return;

      const clickedSquare: Square = { row, col };
      const piece = board[row][col];

      // If a piece is already selected
      if (selectedSquare) {
        // Try to make a move
        if (isValidMove(board, selectedSquare, clickedSquare, currentTurn)) {
          const newBoard = makeMove(board, selectedSquare, clickedSquare);
          
          // Check if move puts own king in check (illegal)
          if (isKingInCheck(newBoard, currentTurn)) {
            setSelectedSquare(null);
            setValidMoves([]);
            return;
          }

          setBoard(newBoard);
          setLastMove({ from: selectedSquare, to: clickedSquare });
          setSelectedSquare(null);
          setValidMoves([]);

          const nextTurn = currentTurn === 'white' ? 'black' : 'white';

          // Check for check/checkmate
          if (isCheckmate(newBoard, nextTurn)) {
            onGameEnd?.(currentTurn);
            return;
          }

          if (isKingInCheck(newBoard, nextTurn)) {
            setInCheck(nextTurn);
          } else {
            setInCheck(null);
          }

          setCurrentTurn(nextTurn);
        } else {
          // Select a different piece
          if (piece && piece.color === currentTurn) {
            setSelectedSquare(clickedSquare);
            setValidMoves(getValidMoves(board, clickedSquare, currentTurn));
          } else {
            setSelectedSquare(null);
            setValidMoves([]);
          }
        }
      } else {
        // Select a piece
        if (piece && piece.color === currentTurn) {
          setSelectedSquare(clickedSquare);
          setValidMoves(getValidMoves(board, clickedSquare, currentTurn));
        }
      }
    },
    [board, selectedSquare, currentTurn, disabled, onGameEnd]
  );

  const isSquareHighlighted = (row: number, col: number): boolean => {
    return validMoves.some((move) => move.row === row && move.col === col);
  };

  const isSquareSelected = (row: number, col: number): boolean => {
    return selectedSquare?.row === row && selectedSquare?.col === col;
  };

  const isLastMoveSquare = (row: number, col: number): boolean => {
    return (
      (lastMove?.from.row === row && lastMove?.from.col === col) ||
      (lastMove?.to.row === row && lastMove?.to.col === col)
    );
  };

  const isKingSquare = (row: number, col: number): boolean => {
    const piece = board[row][col];
    return piece?.type === 'king' && piece.color === inCheck;
  };

  const renderPiece = (piece: Piece | null) => {
    if (!piece) return null;

    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`chess-piece text-4xl md:text-5xl select-none ${
          piece.color === 'white' ? 'text-foreground' : 'text-muted-foreground'
        }`}
        style={{
          textShadow: piece.color === 'white' 
            ? '0 2px 4px rgba(0,0,0,0.5)' 
            : '0 2px 4px rgba(0,0,0,0.8)',
        }}
      >
        {PIECE_SYMBOLS[piece.type][piece.color]}
      </motion.span>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 mb-2">
        <div
          className={`w-4 h-4 rounded-full ${
            currentTurn === 'white' ? 'bg-foreground' : 'bg-muted-foreground'
          }`}
        />
        <span className="text-lg font-medium">
          Turno: {currentTurn === 'white' ? 'Blancas' : 'Negras'}
        </span>
        {inCheck && (
          <span className="text-destructive font-bold animate-pulse">¡JAQUE!</span>
        )}
      </div>

      <div className="glass-card p-3 md:p-4 animate-pulse-glow">
        <div className="grid grid-cols-8 gap-0 rounded-lg overflow-hidden border-2 border-primary/30">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const isHighlighted = isSquareHighlighted(rowIndex, colIndex);
              const isSelected = isSquareSelected(rowIndex, colIndex);
              const isLastMove = isLastMoveSquare(rowIndex, colIndex);
              const isKingInDanger = isKingSquare(rowIndex, colIndex);

              return (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  whileHover={{ scale: disabled ? 1 : 1.02 }}
                  whileTap={{ scale: disabled ? 1 : 0.98 }}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  className={`
                    w-10 h-10 md:w-14 md:h-14 lg:w-16 lg:h-16
                    flex items-center justify-center
                    cursor-pointer transition-all duration-200
                    ${isLight ? 'chess-square-light' : 'chess-square-dark'}
                    ${isSelected ? 'ring-4 ring-chess-selected ring-inset' : ''}
                    ${isLastMove ? 'bg-chess-highlight/30' : ''}
                    ${isKingInDanger ? 'bg-chess-danger/50' : ''}
                    ${disabled ? 'cursor-not-allowed opacity-80' : ''}
                  `}
                >
                  <AnimatePresence>
                    {isHighlighted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={`absolute w-3 h-3 md:w-4 md:h-4 rounded-full ${
                          piece ? 'ring-4 ring-chess-highlight w-full h-full bg-transparent' : 'bg-chess-highlight/60'
                        }`}
                      />
                    )}
                  </AnimatePresence>
                  {renderPiece(piece)}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex gap-2 text-sm text-muted-foreground">
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => (
          <span key={file} className="w-10 md:w-14 lg:w-16 text-center font-mono">
            {file}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ChessBoard;
