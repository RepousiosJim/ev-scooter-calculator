// Main calculator types
export interface ScooterConfig {
  v: number;              // Battery voltage
  ah: number;             // Battery capacity
  motors: number;         // Number of motors
  watts: number;          // Power per motor
  controller?: number;    // Controller amp limit (optional)
  style: number;          // Riding style (Wh/km consumption)
  weight: number;         // Rider weight (kg)
  wheel: number;          // Wheel size (inches)
  rpm?: number;           // Motor RPM (optional, for speed calc)
  charger: number;        // Charger amperage
  regen: number;         // Regeneration efficiency (0-1)
  cost: number;           // Electricity cost per kWh
  slope: number;         // Hill slope (%)
  ridePosition: number;  // Drag coefficient (0.4-0.6)
  soh: number;           // Battery state of health (0-1)
  id?: number;           // Profile ID
  name?: string;         // Profile name
}

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
  upgrade: 'parallel' | 'voltage' | 'controller';
}

export interface ScooterPreset {
  [key: string]: ScooterConfig;
}

export interface Profile {
  id: number;
  name: string;
  config: ScooterConfig;
}
