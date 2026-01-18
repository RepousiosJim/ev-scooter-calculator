// Main calculator types
export type PredictionMode = 'spec' | 'realworld';
export type DeltaDirection = 'up' | 'down' | 'neutral';

export interface ScooterConfig {
  v: number;                   // Battery voltage (24-96V)
  ah: number;                  // Battery capacity (5+ Ah)
  motors: number;              // Number of motors (1-4)
  watts: number;               // Power per motor (250+ W)
  controller?: number;         // Controller amp limit (optional)
  style: number;               // Riding style (Wh/km consumption)
  weight: number;              // Rider weight (50-150 kg)
  wheel: number;               // Wheel size (8-13 inches)
  // DEPRECATED: Use motorKv instead (to be removed in v2.0)
  rpm?: number;
  motorKv?: number;            // Motor KV rating (rpm/V, optional)
  scooterWeight?: number;      // Scooter weight (kg, optional - overrides derived)
  drivetrainEfficiency?: number; // Drivetrain efficiency (0-1, optional)
  batterySagPercent?: number;   // Battery sag at peak draw (0-1, optional)
  charger: number;             // Charger amperage (2-10A)
  regen: number;              // Regeneration efficiency (0-1)
  cost: number;                // Electricity cost per kWh
  slope: number;              // Hill slope (%)
  ridePosition: number;       // Drag coefficient (0.4-0.6)
  soh: number;                // Battery state of health (0-1)
  ambientTemp: number;         // Ambient temperature (°C, -20 to 50)
  id?: number;                // Profile ID
  name?: string;              // Profile name
}

// Type for URL shareable configuration (excludes metadata)
export type ShareableConfig = Omit<ScooterConfig, 'id' | 'name' | 'rpm'>;

export interface PerformanceStats {
  wh: number;              // Total energy (Watt-hours)
  totalRange: number;      // Estimated range (km)
  speed: number;           // Top speed (km/h)
  hillSpeed: number;       // Max speed on hill (km/h)
  totalWatts: number;      // Peak power (W)
  chargeTime: number;      // Time to charge (hours)
  costPer100km: number;    // Cost per 100km
  accelScore: number;      // Acceleration score (0-100)
  amps: number;           // Current draw (amps)
  cRate: number;          // Battery discharge rate (C)
}

export interface Bottleneck {
  type: 'SAG_WARNING' | 'CONTROLLER_LIMIT' | 'GEAR_RATIO_LIMIT' | 'HILL_CLIMB_LIMIT';
  message: string;
  upgrade: 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires';
}

export interface ScooterPreset {
  [key: string]: ScooterConfig;
}

export interface Profile {
  id: number;
  name: string;
  config: ScooterConfig;
}

export interface UpgradeDelta {
  mode: PredictionMode;
  whChange: number;
  rangeChange: number;
  speedChange: number;
  hillSpeedChange: number;
  powerChange: number;
  chargeTimeChange: number;
  costChange: number;
  accelChange: number;
  ampsChange: number;
  cRateChange: number;
  whPercent: number;
  rangePercent: number;
  speedPercent: number;
  accelPercent: number;
  costPercent: number;
  hillSpeedPercent: number;
  powerPercent: number;
  chargeTimePercent: number;
  ampsPercent: number;
  cRatePercent: number;
}

export interface Recommendation {
  upgradeType: 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires';
  title: string;
  reason: string;
  whatChanges: string;
  expectedGains: {
    spec: string;
    realworld: string;
  };
  tradeoffs: string;
  confidence: 'high' | 'medium' | 'low';
  estimatedCost: string;
  difficulty: 'easy' | 'moderate' | 'hard';
}

export interface PresetMetadata {
  manufacturer: {
    topSpeed: number;
    range: number;
    batteryWh: number;
    powerToWeight?: number;
  };
  tested?: {
    topSpeed: number;
    range: number;
    whPerKm: number;
    powerToWeight?: number;
  };
}

export type RideMode = 'eco' | 'normal' | 'sport' | 'turbo';

export interface RideModePreset {
  id: RideMode;
  name: string;
  description: string;
  speedLimit: number;
  powerLimit: number;
  style: number;
  regen: number;
}

// Formula Details types
export interface FormulaInput {
  name: string;
  value: number;
  unit: string;
}

export interface FormulaIntermediate {
  name: string;
  value: number;
  unit: string;
  description?: string;
}

export interface FormulaTrace {
  category: 'energy' | 'speed' | 'power' | 'range' | 'charging' | 'cost' | 'metrics';
  name: string;
  formula: string;
  inputs: FormulaInput[];
  intermediates: FormulaIntermediate[];
  result: {
    value: number;
    unit: string;
    label: string;
  };
  timestamp: number;
}
