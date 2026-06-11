import React from 'react';
import type { PortType } from '@opensettlers/shared';
import type { Point } from '@opensettlers/shared';
import woodImg from '../../assets/wood.png';
import brickImg from '../../assets/brick.png';
import wheatImg from '../../assets/wheat.png';
import sheepImg from '../../assets/sheep.png';
import oreImg from '../../assets/ore.png';

interface Props {
  position: Point;
  portType: PortType;
  size: number;
  uiScale?: number;
}

const PORT_DISPLAY: Record<string, { img: string | null; label: string; bg: string }> = {
  wood_2_1:    { img: woodImg,  label: '2:1', bg: '#2d6a27' },
  brick_2_1:   { img: brickImg, label: '2:1', bg: '#c44a1a' },
  wheat_2_1:   { img: wheatImg, label: '2:1', bg: '#d4b44a' },
  sheep_2_1:   { img: sheepImg, label: '2:1', bg: '#7dbb4e' },
  ore_2_1:     { img: oreImg,   label: '2:1', bg: '#8a8a8a' },
  generic_3_1: { img: null,     label: '3:1', bg: '#457b9d' },
};

export function PortMarker({ position, portType, size, uiScale = 1 }: Props) {
  const display = PORT_DISPLAY[portType];
  if (!display) return null;

  const { x, y } = position;
  const s = size / 70; // scale factor relative to base size

  // Badge sits centered on the hull
  const br = size * 0.13;
  const badgeY = y + size * 0.055;

  return (
    <g transform={uiScale !== 1 ? `translate(${x} ${y}) scale(${uiScale}) translate(${-x} ${-y})` : undefined}>
      {/* ── Ship silhouette (side view, all coords in "ship units" scaled by s) ── */}
      <g transform={`translate(${x}, ${y}) scale(${s})`}>

        {/* Water reflection / shadow */}
        <ellipse cx="0" cy="14" rx="20" ry="4.5" fill="rgba(0,0,0,0.18)" />

        {/* Hull */}
        <path
          d="M -18 4 Q -21 12 0 13 Q 21 12 18 4 L 14 -1 L -14 -1 Z"
          fill="#7a4e22"
          stroke="#3a1c00"
          strokeWidth="1"
        />
        {/* Hull highlight — lighter upper strip */}
        <path
          d="M -13 -1 L 13 -1 L 12 2 L -12 2 Z"
          fill="#c8904a"
          stroke="none"
          opacity="0.7"
        />
        {/* Railing posts — tiny verticals along the deck edge */}
        {([-10, -5, 0, 5, 10] as number[]).map((ox) => (
          <line key={ox} x1={ox} y1={-1} x2={ox} y2={-4} stroke="#5a3010" strokeWidth="0.9" opacity="0.75" />
        ))}
        {/* Railing top beam */}
        <line x1="-11" y1="-4" x2="11" y2="-4" stroke="#8b5a2b" strokeWidth="1" opacity="0.8" />

        {/* Mast */}
        <line x1="0" y1="-1" x2="0" y2="-30" stroke="#4a2800" strokeWidth="2" />
        {/* Crow's nest ring */}
        <ellipse cx="0" cy="-24" rx="3.5" ry="1.5" fill="none" stroke="#6a3808" strokeWidth="1.2" />

        {/* Main sail */}
        <path
          d="M 1 -28 L 17 -15 L 1 -7 Z"
          fill="#f5e8cc"
          stroke="#c0a870"
          strokeWidth="0.8"
          opacity="0.92"
        />
        {/* Fore sail */}
        <path
          d="M -1 -24 L -13 -14 L -1 -9 Z"
          fill="#ede0c0"
          stroke="#b09860"
          strokeWidth="0.8"
          opacity="0.88"
        />
        {/* Horizontal yard */}
        <line x1="-6" y1="-22" x2="10" y2="-22" stroke="#4a2800" strokeWidth="1" />

        {/* Pennant flag */}
        <path d="M 0 -30 L 7 -27 L 0 -24" fill="#c0392b" stroke="none" />
      </g>

      {/* Resource badge on hull center */}
      <circle cx={x} cy={badgeY} r={br} fill={display.bg} stroke="#fff" strokeWidth={1.3} opacity={0.95} />
      {display.img ? (
        <image
          href={display.img}
          x={x - br * 0.72}
          y={badgeY - br * 0.72}
          width={br * 1.44}
          height={br * 1.44}
        />
      ) : (
        <text
          x={x}
          y={badgeY + 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={br * 0.95}
          fill="#fff"
          fontWeight="bold"
        >?</text>
      )}

      {/* Trade ratio label below hull */}
      <text
        x={x}
        y={y + size * 0.24}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.1}
        fill="#fff"
        fontWeight="bold"
        stroke="#000"
        strokeWidth={0.5}
        paintOrder="stroke"
      >{display.label}</text>
    </g>
  );
}
