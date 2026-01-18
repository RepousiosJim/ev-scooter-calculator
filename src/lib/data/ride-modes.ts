import type { RideModePreset } from '$lib/types';

export const rideModePresets: Record<RideModePreset['id'], RideModePreset> = {
  eco: {
    id: 'eco',
    name: 'Eco',
    description: 'Maximum range with reduced speed and power',
    speedLimit: 20,
    powerLimit: 0.5,
    style: 18,
    regen: 0.12
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    description: 'Balanced performance for everyday riding',
    speedLimit: 35,
    powerLimit: 0.75,
    style: 24,
    regen: 0.08
  },
  sport: {
    id: 'sport',
    name: 'Sport',
    description: 'Higher performance with increased acceleration',
    speedLimit: 50,
    powerLimit: 0.9,
    style: 32,
    regen: 0.05
  },
  turbo: {
    id: 'turbo',
    name: 'Turbo',
    description: 'Maximum speed and power output',
    speedLimit: 70,
    powerLimit: 1,
    style: 42,
    regen: 0.03
  }
};

export const rideModeIds: RideModePreset['id'][] = ['eco', 'normal', 'sport', 'turbo'];
