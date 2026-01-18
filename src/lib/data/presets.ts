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
  soh: 1,
  ambientTemp: 20
};

export const presets: ScooterPreset = {
  custom: customPreset,
  m365_2025: {
    v: 36,
    ah: 10.4,
    motors: 1,
    watts: 300,
    style: 24,
    weight: 75,
    wheel: 8.5,
    motorKv: 55,
    scooterWeight: 12.5,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 2,
    regen: 0.05,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1,
    ambientTemp: 20
  },
  f2pro: {
    v: 36,
    ah: 12.8,
    motors: 1,
    watts: 450,
    style: 26,
    weight: 78,
    wheel: 10,
    motorKv: 60,
    scooterWeight: 18,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 2.5,
    regen: 0.05,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1,
    ambientTemp: 20
  },
  es4: {
    v: 36,
    ah: 10.4,
    motors: 1,
    watts: 350,
    style: 26,
    weight: 72,
    wheel: 8.5,
    motorKv: 58,
    scooterWeight: 14,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 2,
    regen: 0.05,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1,
    ambientTemp: 20
  },
  kqi3max: {
    v: 48,
    ah: 12.8,
    motors: 1,
    watts: 450,
    style: 28,
    weight: 80,
    wheel: 9.5,
    motorKv: 60,
    scooterWeight: 22,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 3,
    regen: 0.05,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1,
    ambientTemp: 20
  },
  apollo_city_2025: {
    v: 52,
    ah: 20,
    motors: 2,
    watts: 1000,
    style: 32,
    weight: 85,
    wheel: 10,
    motorKv: 65,
    scooterWeight: 32,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 4,
    regen: 0.08,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.55,
    soh: 1,
    ambientTemp: 20
  },
  vsett9plus: {
    v: 52,
    ah: 19.2,
    motors: 2,
    watts: 650,
    style: 30,
    weight: 82,
    wheel: 8.5,
    motorKv: 60,
    scooterWeight: 25,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 3,
    regen: 0.08,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.6,
    soh: 1,
    ambientTemp: 20
  },
  mantis10: {
    v: 60,
    ah: 18.2,
    motors: 2,
    watts: 1000,
    style: 34,
    weight: 85,
    wheel: 10,
    motorKv: 65,
    scooterWeight: 30,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 3.5,
    regen: 0.08,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.55,
    soh: 1,
    ambientTemp: 20
  },
  gt2: {
    v: 72,
    ah: 30,
    motors: 2,
    watts: 1500,
    style: 40,
    weight: 95,
    wheel: 11,
    motorKv: 75,
    scooterWeight: 52,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 5,
    regen: 0.1,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.5,
    soh: 1,
    ambientTemp: 20
  },
  thunder3: {
    v: 72,
    ah: 40,
    motors: 2,
    watts: 2000,
    style: 42,
    weight: 100,
    wheel: 11,
    motorKv: 75,
    scooterWeight: 52,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 5,
    regen: 0.1,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.5,
    soh: 1,
    ambientTemp: 20
  },
  burne2max: {
    v: 72,
    ah: 40,
    motors: 2,
    watts: 1500,
    style: 40,
    weight: 95,
    wheel: 11,
    motorKv: 70,
    scooterWeight: 47,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 5,
    regen: 0.1,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.5,
    soh: 1,
    ambientTemp: 20
  },
  wolfkinggtr: {
    v: 72,
    ah: 50,
    motors: 2,
    watts: 2000,
    style: 45,
    weight: 105,
    wheel: 11,
    motorKv: 80,
    scooterWeight: 55,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
    charger: 5,
    regen: 0.1,
    cost: 0.20,
    slope: 0,
    ridePosition: 0.5,
    soh: 1,
    ambientTemp: 20
  }
};

export const defaultConfig: ScooterConfig = {
  ...customPreset,
  controller: undefined,
  rpm: undefined
};

export const presetMetadata: Record<string, PresetMetadata> = {
  m365_2025: {
    manufacturer: {
      topSpeed: 25,
      range: 30,
      batteryWh: 374
    }
  },
  f2pro: {
    manufacturer: {
      topSpeed: 32,
      range: 40,
      batteryWh: 461
    }
  },
  es4: {
    manufacturer: {
      topSpeed: 30,
      range: 35,
      batteryWh: 374
    }
  },
  kqi3max: {
    manufacturer: {
      topSpeed: 40,
      range: 55,
      batteryWh: 614,
      powerToWeight: 20
    }
  },
  apollo_city_2025: {
    manufacturer: {
      topSpeed: 55,
      range: 60,
      batteryWh: 1040,
      powerToWeight: 50
    }
  },
  vsett9plus: {
    manufacturer: {
      topSpeed: 50,
      range: 70,
      batteryWh: 998,
      powerToWeight: 40
    }
  },
  mantis10: {
    manufacturer: {
      topSpeed: 60,
      range: 75,
      batteryWh: 1092,
      powerToWeight: 55
    }
  },
  gt2: {
    manufacturer: {
      topSpeed: 70,
      range: 90,
      batteryWh: 2160,
      powerToWeight: 60
    }
  },
  thunder3: {
    manufacturer: {
      topSpeed: 95,
      range: 125,
      batteryWh: 2880,
      powerToWeight: 80
    }
  },
  burne2max: {
    manufacturer: {
      topSpeed: 80,
      range: 120,
      batteryWh: 2880,
      powerToWeight: 65
    }
  },
  wolfkinggtr: {
    manufacturer: {
      topSpeed: 100,
      range: 150,
      batteryWh: 3600,
      powerToWeight: 85
    }
  }
};
