export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export interface Square {
  row: number;
  col: number;
}

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  castling?: 'kingside' | 'queenside';
  enPassant?: boolean;
}

export type Board = (Piece | null)[][];

export const PIECE_SYMBOLS: Record<PieceType, Record<PieceColor, string>> = {
  king: { white: '♔', black: '♚' },
  queen: { white: '♕', black: '♛' },
  rook: { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' },
  pawn: { white: '♙', black: '♟' },
};

export const createInitialBoard = (): Board => {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  // Place pawns
  for (let col = 0; col < 8; col++) {
    board[1][col] = { type: 'pawn', color: 'black' };
    board[6][col] = { type: 'pawn', color: 'white' };
  }

  // Place other pieces
  const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  
  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRow[col], color: 'black' };
    board[7][col] = { type: backRow[col], color: 'white' };
  }

  return board;
};

export const isValidMove = (
  board: Board,
  from: Square,
  to: Square,
  currentTurn: PieceColor
): boolean => {
  const piece = board[from.row][from.col];
  if (!piece || piece.color !== currentTurn) return false;

  const targetPiece = board[to.row][to.col];
  if (targetPiece && targetPiece.color === piece.color) return false;

  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;
  const absRowDiff = Math.abs(rowDiff);
  const absColDiff = Math.abs(colDiff);

  switch (piece.type) {
    case 'pawn': {
      const direction = piece.color === 'white' ? -1 : 1;
      const startRow = piece.color === 'white' ? 6 : 1;

      // Normal move
      if (colDiff === 0 && !targetPiece) {
        if (rowDiff === direction) return true;
        if (from.row === startRow && rowDiff === 2 * direction) {
          return !board[from.row + direction][from.col];
        }
      }

      // Capture
      if (absColDiff === 1 && rowDiff === direction && targetPiece) {
        return true;
      }

      return false;
    }

    case 'rook':
      if (rowDiff !== 0 && colDiff !== 0) return false;
      return isPathClear(board, from, to);

    case 'knight':
      return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);

    case 'bishop':
      if (absRowDiff !== absColDiff) return false;
      return isPathClear(board, from, to);

    case 'queen':
      if (rowDiff !== 0 && colDiff !== 0 && absRowDiff !== absColDiff) return false;
      return isPathClear(board, from, to);

    case 'king':
      return absRowDiff <= 1 && absColDiff <= 1;

    default:
      return false;
  }
};

const isPathClear = (board: Board, from: Square, to: Square): boolean => {
  const rowDir = Math.sign(to.row - from.row);
  const colDir = Math.sign(to.col - from.col);

  let row = from.row + rowDir;
  let col = from.col + colDir;

  while (row !== to.row || col !== to.col) {
    if (board[row][col]) return false;
    row += rowDir;
    col += colDir;
  }

  return true;
};

export const getValidMoves = (board: Board, from: Square, currentTurn: PieceColor): Square[] => {
  const validMoves: Square[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (isValidMove(board, from, { row, col }, currentTurn)) {
        validMoves.push({ row, col });
      }
    }
  }

  return validMoves;
};

export const makeMove = (board: Board, from: Square, to: Square): Board => {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[from.row][from.col];

  // Handle pawn promotion
  if (piece?.type === 'pawn' && (to.row === 0 || to.row === 7)) {
    newBoard[to.row][to.col] = { type: 'queen', color: piece.color };
  } else {
    newBoard[to.row][to.col] = piece;
  }

  newBoard[from.row][from.col] = null;
  return newBoard;
};

export const isKingInCheck = (board: Board, color: PieceColor): boolean => {
  // Find king position
  let kingPos: Square | null = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece?.type === 'king' && piece.color === color) {
        kingPos = { row, col };
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  // Check if any opponent piece can capture the king
  const opponentColor = color === 'white' ? 'black' : 'white';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece?.color === opponentColor) {
        if (isValidMove(board, { row, col }, kingPos, opponentColor)) {
          return true;
        }
      }
    }
  }

  return false;
};

export const isCheckmate = (board: Board, color: PieceColor): boolean => {
  if (!isKingInCheck(board, color)) return false;

  // Try all possible moves
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece?.color === color) {
        const moves = getValidMoves(board, { row: fromRow, col: fromCol }, color);
        for (const move of moves) {
          const newBoard = makeMove(board, { row: fromRow, col: fromCol }, move);
          if (!isKingInCheck(newBoard, color)) {
            return false;
          }
        }
      }
    }
  }

  return true;
};

export const formatSquare = (square: Square): string => {
  const files = 'abcdefgh';
  return `${files[square.col]}${8 - square.row}`;
};
