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
}

const PORT_DISPLAY: Record<string, { img: string | null; label: string; bg: string }> = {
  wood_2_1:    { img: woodImg,  label: '2:1', bg: '#2d6a27' },
  brick_2_1:   { img: brickImg, label: '2:1', bg: '#c44a1a' },
  wheat_2_1:   { img: wheatImg, label: '2:1', bg: '#d4b44a' },
  sheep_2_1:   { img: sheepImg, label: '2:1', bg: '#7dbb4e' },
  ore_2_1:     { img: oreImg,   label: '2:1', bg: '#8a8a8a' },
  generic_3_1: { img: null,     label: '3:1', bg: '#457b9d' },
};

export function PortMarker({ position, portType, size }: Props) {
  const r = size * 0.22;
  const display = PORT_DISPLAY[portType];
  if (!display) return null;
  return (
    <g>
      <circle cx={position.x} cy={position.y} r={r} fill={display.bg} stroke="#fff" strokeWidth={1.5} opacity={0.9} />
      {display.img ? (
        <image
          href={display.img}
          x={position.x - r * 0.7}
          y={position.y - r * 0.7}
          width={r * 1.4}
          height={r * 1.4}
        />
      ) : (
        <text
          x={position.x}
          y={position.y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={r * 0.9}
          fill="#fff"
          fontWeight="bold"
        >?</text>
      )}
      <text
        x={position.x}
        y={position.y + r + 7}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={r * 0.75}
        fill="#fff"
        fontWeight="bold"
        stroke="#000"
        strokeWidth={0.5}
      >{display.label}</text>
    </g>
  );
}
