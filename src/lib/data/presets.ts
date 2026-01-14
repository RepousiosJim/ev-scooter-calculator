import type { ScooterConfig, ScooterPreset, PresetMetadata } from '$lib/types';

export const customPreset: ScooterConfig = {
  v: 52,
  ah: 16,
  motors: 2,
  watts: 1600,
  style: 30,
  weight: 80,
  wheel: 10,
  motorKv: 65,
  scooterWeight: undefined,
  drivetrainEfficiency: 0.9,
  batterySagPercent: 0.08,
  charger: 3,
  regen: 0.05,
  cost: 0.20,
  slope: 0,
  ridePosition: 0.6,
  soh: 1
};

export const presets: ScooterPreset = {
  custom: customPreset,
  m365: {
    v: 36,
    ah: 10.4,
    motors: 1,
    watts: 250,
    style: 25,
    weight: 75,
    wheel: 8.5,
    motorKv: 55,
    scooterWeight: undefined,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 2,
    regen: 0.05,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1
  },
  es2: {
    v: 36,
    ah: 7.5,
    motors: 1,
    watts: 300,
    style: 25,
    weight: 70,
    wheel: 7.5,
    motorKv: 60,
    scooterWeight: undefined,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 2,
    regen: 0.05,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1
  },
  wolf: {
    v: 52,
    ah: 35,
    motors: 2,
    watts: 2000,
    style: 35,
    weight: 100,
    wheel: 11,
    motorKv: 70,
    scooterWeight: 32,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 4,
    regen: 0.08,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1
  },
  ox: {
    v: 60,
    ah: 21,
    motors: 2,
    watts: 1000,
    style: 30,
    weight: 90,
    wheel: 10,
    motorKv: 55,
    scooterWeight: 26,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 3,
    regen: 0.05,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1
  },
  dualtron: {
    v: 72,
    ah: 31,
    motors: 2,
    watts: 2700,
    style: 45,
    weight: 105,
    wheel: 11,
    motorKv: 70,
    scooterWeight: 45,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 5,
    regen: 0.08,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.5,
    soh: 1
  },
  burne: {
    v: 72,
    ah: 35,
    motors: 2,
    watts: 1500,
    style: 35,
    weight: 95,
    wheel: 10,
    motorKv: 55,
    scooterWeight: 35,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 4,
    regen: 0.08,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.5,
    soh: 1
  },
  emove: {
    v: 52,
    ah: 30,
    motors: 2,
    watts: 1600,
    style: 30,
    weight: 90,
    wheel: 10,
    motorKv: 65,
    scooterWeight: 30,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 3,
    regen: 0.05,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1
  }
};

export const defaultConfig: ScooterConfig = {
  ...customPreset,
  controller: undefined,
  rpm: undefined
};

export const presetMetadata: Record<string, PresetMetadata> = {
  m365: {
    manufacturer: {
      topSpeed: 25,
      range: 30,
      batteryWh: 374
    }
  },
  es2: {
    manufacturer: {
      topSpeed: 25,
      range: 25,
      batteryWh: 270
    }
  },
  wolf: {
    manufacturer: {
      topSpeed: 80,
      range: 150,
      batteryWh: 1820,
      powerToWeight: 50
    },
    tested: {
      topSpeed: 70,
      range: 100,
      whPerKm: 18,
      powerToWeight: 45
    }
  },
  ox: {
    manufacturer: {
      topSpeed: 50,
      range: 110,
      batteryWh: 1260,
      powerToWeight: 35
    },
    tested: {
      topSpeed: 45,
      range: 80,
      whPerKm: 16,
      powerToWeight: 30
    }
  },
  dualtron: {
    manufacturer: {
      topSpeed: 110,
      range: 180,
      batteryWh: 2232,
      powerToWeight: 72
    },
    tested: {
      topSpeed: 95,
      range: 120,
      whPerKm: 19,
      powerToWeight: 65
    }
  },
  burne: {
    manufacturer: {
      topSpeed: 80,
      range: 160,
      batteryWh: 2520,
      powerToWeight: 43
    },
    tested: {
      topSpeed: 70,
      range: 100,
      whPerKm: 25,
      powerToWeight: 38
    }
  },
  emove: {
    manufacturer: {
      topSpeed: 72,
      range: 100,
      batteryWh: 1560,
      powerToWeight: 40
    },
    tested: {
      topSpeed: 60,
      range: 75,
      whPerKm: 21,
      powerToWeight: 35
    }
  }
};
