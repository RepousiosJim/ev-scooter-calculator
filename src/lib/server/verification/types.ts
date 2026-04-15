export type VerificationStatus = 'unverified' | 'verified' | 'disputed' | 'outdated';

export type SpecField =
	| 'topSpeed'
	| 'range'
	| 'batteryWh'
	| 'price'
	| 'voltage'
	| 'motorWatts'
	| 'weight'
	| 'wheelSize'
	| 'powerToWeight';

export type SourceType = 'manufacturer' | 'retailer' | 'review' | 'community' | 'scrape';

export interface SourceEntry {
	id: string;
	type: SourceType;
	name: string;
	url?: string;
	value: number;
	unit: string;
	fetchedAt: string; // ISO timestamp
	addedBy: 'manual' | 'scraper';
	notes?: string;
}

export interface FieldVerification {
	status: VerificationStatus;
	sources: SourceEntry[];
	confidence: number; // 0-100
	verifiedValue?: number;
	lastVerified?: string; // ISO timestamp
	notes?: string;
}

export interface PriceObservation {
	price: number;
	currency: string; // ISO 4217
	source: string;
	url?: string;
	observedAt: string; // ISO timestamp
	inStock?: boolean;
}

export interface ScooterVerification {
	scooterKey: string;
	fields: Partial<Record<SpecField, FieldVerification>>;
	priceHistory: PriceObservation[];
	lastUpdated: string; // ISO timestamp
	overallConfidence: number; // 0-100
}

export interface ScrapeResult {
	scooterKey: string;
	source: string;
	url: string;
	extractedSpecs: Partial<Record<SpecField, number>>;
	scrapedAt: string;
	success: boolean;
	error?: string;
}

export const SPEC_FIELD_UNITS: Record<SpecField, string> = {
	topSpeed: 'km/h',
	range: 'km',
	batteryWh: 'Wh',
	price: 'USD',
	voltage: 'V',
	motorWatts: 'W',
	weight: 'kg',
	wheelSize: 'in',
	powerToWeight: 'W/kg',
};
