// Main calculator types
export type PredictionMode = 'spec' | 'realworld';
export type DeltaDirection = 'up' | 'down' | 'neutral';

export interface ScooterConfig {
	v: number; // Battery voltage (24-96V)
	ah: number; // Battery capacity (5+ Ah)
	motors: number; // Number of motors (1-4)
	watts: number; // Power per motor (250+ W)
	controller?: number; // Controller amp limit (optional)
	style: number; // Base consumption (Wh/km) under reference conditions: 80 kg rider, flat, no regen, full-power cruise
	weight: number; // Rider weight (50-150 kg)
	wheel: number; // Wheel size (8-13 inches)
	// DEPRECATED: Use motorKv instead (to be removed in v2.0)
	rpm?: number;
	motorKv?: number; // Motor KV rating (rpm/V, optional)
	scooterWeight?: number; // Scooter weight (kg, optional - overrides derived)
	drivetrainEfficiency?: number; // Drivetrain efficiency (0-1, optional)
	batterySagPercent?: number; // Battery sag at peak draw (0-1, optional)
	charger: number; // Charger amperage (2-10A)
	regen: number; // Regeneration efficiency (0-1)
	cost: number; // Electricity cost per kWh
	slope: number; // Hill slope (%)
	ridePosition: number; // Drag coefficient (0.4-0.6)
	dragCoefficient?: number; // Aerodynamic drag coefficient
	frontalArea?: number; // Frontal area (m²)
	rollingResistance?: number; // Rolling resistance coefficient
	soh: number; // Battery state of health (0-1)
	ambientTemp: number; // Ambient temperature (°C, -20 to 50)
	speedCap?: number; // Firmware/regulatory top-speed limit (km/h, optional, e.g. 25 for EU-legal models)
	speedFactor?: number; // Ride-mode speed limit as a fraction of full top speed (0-1, default 1)
	powerLimit?: number; // Ride-mode power limit as a fraction of full power (0-1, default 1)
	id?: number; // Profile ID
	name?: string; // Profile name
}

export interface PerformanceStats {
	wh: number; // Total energy (Watt-hours)
	totalRange: number; // Estimated range (km)
	speed: number; // Top speed (km/h)
	hillSpeed: number; // Max speed on hill (km/h)
	totalWatts: number; // Peak power (W)
	chargeTime: number; // Time to charge (hours)
	costPer100km: number; // Cost per 100km
	accelScore: number; // Acceleration score (0-100)
	amps: number; // Current draw (amps)
	cRate: number; // Battery discharge rate (C)
	/** Motor power before the controller's current limit (W); equals totalWatts when not limited. */
	uncappedWatts?: number;
	/** True when the controller's current limit is what caps power. */
	controllerLimited?: boolean;
	/** Physics-only Wh/km at reference conditions (for calibration sanity checks; not a displayed figure). */
	referencePhysicsWhPerKm?: number;
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
	name: string;
	year: number;
	manufacturer: {
		topSpeed: number;
		range: number;
		batteryWh: number;
		powerToWeight?: number;
		price?: number; // Current retail price (USD)
	};
	/**
	 * Independent test results (e.g. ERideHero, ESG), when available. A tested
	 * range takes precedence over the manufacturer's claim when calibrating base
	 * consumption, because some claims are eco-mode figures far above real use.
	 */
	tested?: {
		topSpeed?: number;
		range?: number;
		whPerKm?: number;
		powerToWeight?: number;
		source?: string;
	};
	// Data tracking fields
	addedDate?: string; // ISO date when first added (YYYY-MM-DD)
	lastVerified?: string; // ISO date when data was last checked (YYYY-MM-DD)
	source?: string; // Where the data came from (e.g. "manufacturer website")
	sourceUrl?: string; // URL for verification
	status?: 'current' | 'discontinued' | 'upcoming' | 'unverified';
	priceHistory?: Array<{ date: string; price: number }>; // Price change log
	notes?: string; // Freeform notes (e.g. "2025 refresh rumored")
}

export type RideMode = 'eco' | 'normal' | 'sport' | 'turbo';

export interface RideModePreset {
	id: RideMode;
	name: string;
	description: string;
	speedFactor: number; // Fraction of the scooter's full top speed (0-1)
	powerLimit: number; // Fraction of the scooter's full power (0-1)
	regen: number;
}

export type TerrainMode = 'urban' | 'suburban' | 'highway' | 'hilly';

export interface TerrainModePreset {
	id: TerrainMode;
	name: string;
	description: string;
	icon: string;
	slope: number;
}
