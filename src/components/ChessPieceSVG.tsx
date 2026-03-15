import React from 'react';
import { PieceType, PieceColor } from '@/lib/chess';

// Chess.com style pieces (simplified SVG paths for common piece sets)
// Note: In a real production app, these would be separate .svg files
// but for this implementation, we'll use a clean SVG component to keep it self-contained and fast.

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
}

export const ChessPieceSVG: React.FC<ChessPieceProps> = ({ type, color, className }) => {
  const isWhite = color === 'white';
  const fill = isWhite ? '#FFFFFF' : '#000000';
  const stroke = isWhite ? '#000000' : '#FFFFFF';

  // Return SVG based on type (Neo/Chess.com style paths)
  switch (type) {
    case 'pawn':
      return (
        <svg viewBox="0 0 45 45" preserveAspectRatio="xMidYMid meet" className={className}>
          <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'knight':
      return (
        <svg viewBox="0 0 45 45" preserveAspectRatio="xMidYMid meet" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22,10 C 32.5,11 34.5,19 34.5,19 C 33,16 30,17.5 30,17.5 C 28.5,20 26.5,21 26.5,21 L 25,23.5 C 29,26.5 31,28.5 31,34.5 L 14,34.5 C 14,29.5 15.5,27.5 20,22.5 C 20,21.5 19,19.5 16,14.5 C 13,9.5 18,8.5 21,9.5 C 21,9.5 22,8.5 22,10 Z" />
            <path d="M 24,18 C 24.5,19.5 23,20.5 23,20.5" fill="none" />
            <path d="M 16,11 C 17,10 18,10 19,11" fill="none" />
          </g>
        </svg>
      );
    case 'bishop':
      return (
        <svg viewBox="0 0 45 45" preserveAspectRatio="xMidYMid meet" className={className}>
          <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <g fill={fill} strokeLinecap="butt">
              <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.06 9,36 9,36 z" />
              <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 28.5,10.5 C 23.5,6.5 17.5,6.5 12.5,10.5 C 7.5,14.5 8,24.5 13.5,26 C 13.5,26 11,27.5 11,30 C 11,30 10.5,30.5 11,32 z" />
              <path d="M 25 8 A 2.5 2.5 0 1 1 20 8 A 2.5 2.5 0 1 1 25 8 z" />
            </g>
            <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15 L 22.5,20 M 20,17.5 L 25,17.5" fill="none" strokeLinejoin="miter" />
          </g>
        </svg>
      );
    case 'rook':
      return (
        <svg viewBox="0 0 45 45" preserveAspectRatio="xMidYMid meet" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z " />
            <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z " />
            <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
            <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
            <path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17" />
            <path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5" />
            <path d="M 11,14 L 34,14" fill="none" />
          </g>
        </svg>
      );
    case 'queen':
      return (
        <svg viewBox="0 0 45 45" preserveAspectRatio="xMidYMid meet" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 8 12 A 2 2 0 1 1 4 12 A 2 2 0 1 1 8 12 z M 24.5 7.5 A 2 2 0 1 1 20.5 7.5 A 2 2 0 1 1 24.5 7.5 z M 41 12 A 2 2 0 1 1 37 12 A 2 2 0 1 1 41 12 z M 11 20 A 2 2 0 1 1 7 20 A 2 2 0 1 1 11 20 z M 38 20 A 2 2 0 1 1 34 20 A 2 2 0 1 1 38 20 z" />
            <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38,14 L 31,25 L 31,11 L 25.5,24.5 L 22.5,9.5 L 19.5,24.5 L 14,11 L 14,25 L 7,14 L 9,26 z M 9,26 C 9,28 10.5,28 11.5,30 C 13,31 14.5,31.5 15.5,31.5 C 18,31.5 20.5,30 22.5,30 C 24.5,30 27,31.5 29.5,31.5 C 30.5,31.5 32,31 33.5,30 C 34.5,28 36,28 36,26 C 36,22 32.5,20 32.5,20 L 12.5,20 C 12.5,20 9,22 9,26 z" />
            <path d="M 11.5,30 C 15,29 30,29 33.5,30 M 12,33.5 C 18,32.5 27,32.5 33,33.5" fill="none" />
          </g>
        </svg>
      );
    case 'king':
      return (
        <svg viewBox="0 0 45 45" preserveAspectRatio="xMidYMid meet" className={className}>
          <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8" strokeLinejoin="miter" />
            <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,15 C 24,12.5 19.5,12.5 19.5,15 C 18,17.5 22.5,25 22.5,25 z" fill={fill} />
            <path d="M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,18.5 37.5,23.5 37.5,23.5 C 37.5,23.5 39.5,13.5 34.5,11.5 C 29.5,9.5 30.5,23.5 30.5,23.5 C 30.5,23.5 26.5,22.5 24,22.5 C 21.5,22.5 21.5,23.5 21.5,23.5 C 21.5,23.5 14.5,9.5 11.5,11.5 C 6.5,13.5 8.5,23.5 8.5,23.5 C 8.5,23.5 11.5,18.5 7.5,19.5 C 4.5,25.5 13.5,30 13.5,30 L 13.5,37 z" fill={fill} />
            <path d="M 11.5,30 C 17,27 27,27 32.5,30 M 11,33.5 C 17,32.5 27,32.5 33,33.5" />
          </g>
        </svg>
      );
    default:
      return null;
  }
};
