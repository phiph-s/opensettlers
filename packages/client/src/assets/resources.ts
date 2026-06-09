import woodImg from './wood.png';
import brickImg from './brick.png';
import wheatImg from './wheat.png';
import sheepImg from './sheep.png';
import oreImg from './ore.png';

export const RESOURCE_IMAGES: Record<string, string> = {
  wood: woodImg,
  brick: brickImg,
  wheat: wheatImg,
  sheep: sheepImg,
  ore: oreImg,
};

export const RESOURCE_COLORS: Record<string, string> = {
  wood: '#2d6a27',
  brick: '#c44a1a',
  wheat: '#d4b44a',
  sheep: '#7dbb4e',
  ore: '#8a8a8a',
};

export const RESOURCE_LABELS: Record<string, string> = {
  wood: 'Wood',
  brick: 'Brick',
  wheat: 'Wheat',
  sheep: 'Sheep',
  ore: 'Ore',
};
