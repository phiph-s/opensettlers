export type Resource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore';

export type DevCardType =
  | 'knight'
  | 'road_building'
  | 'year_of_plenty'
  | 'monopoly'
  | 'victory_point';

export type BuildingType = 'settlement' | 'city';

export type PortType =
  | 'generic_3_1'
  | 'wood_2_1'
  | 'brick_2_1'
  | 'wheat_2_1'
  | 'sheep_2_1'
  | 'ore_2_1';

export type TerrainType =
  | 'forest'
  | 'hills'
  | 'fields'
  | 'pasture'
  | 'mountains'
  | 'desert'
  | 'sea';

export type PlayerColor = 'red' | 'blue' | 'orange' | 'white' | 'green' | 'purple';

export const TERRAIN_TO_RESOURCE: Record<Exclude<TerrainType, 'desert' | 'sea'>, Resource> = {
  forest: 'wood',
  hills: 'brick',
  fields: 'wheat',
  pasture: 'sheep',
  mountains: 'ore',
};

export const PORT_RESOURCE: Partial<Record<PortType, Resource>> = {
  wood_2_1: 'wood',
  brick_2_1: 'brick',
  wheat_2_1: 'wheat',
  sheep_2_1: 'sheep',
  ore_2_1: 'ore',
};
