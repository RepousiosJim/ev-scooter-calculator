import type { ScooterConfig, UpgradeDelta, Recommendation, PerformanceStats } from '$lib/types';
import { calculatePerformance } from './calculator';

export function simulateUpgrade(
	config: ScooterConfig,
	upgradeType: 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires'
): ScooterConfig {
	const newConfig: ScooterConfig = { ...config };

	switch (upgradeType) {
		case 'parallel':
			newConfig.ah *= 2;
			break;
		case 'voltage': {
			// Overvoltage: BLDC motor RPM and power both scale linearly with voltage
			const vMultiplier = 1.2;
			newConfig.watts = Math.round(newConfig.watts * vMultiplier);
			newConfig.v = Math.round(newConfig.v * vMultiplier);
			break;
		}
		case 'controller':
			newConfig.controller = undefined;
			break;
		case 'motor':
			if (newConfig.motors === 1) {
				newConfig.motors = 2;
			}
			newConfig.watts = Math.round(newConfig.watts * 1.5);
			break;
		case 'tires':
			if (newConfig.wheel < 11) {
				newConfig.wheel = Math.min(newConfig.wheel + 1, 11);
			}
			newConfig.rollingResistance = 0.012;
			break;
	}

	return newConfig;
}

export function calculateUpgradeDelta(
	config: ScooterConfig,
	upgradeType: 'parallel' | 'voltage' | 'controller' | 'motor' | 'tires'
): UpgradeDelta {
	const currentSpec = calculatePerformance(config, 'spec');

	const upgradedConfig = simulateUpgrade(config, upgradeType);
	const upgradedSpec = calculatePerformance(upgradedConfig, 'spec');

	const safePercent = (current: number, upgraded: number) => {
		if (current === 0) return 0;
		return (upgraded / current - 1) * 100;
	};

	return {
		mode: 'spec',
		whChange: upgradedSpec.wh - currentSpec.wh,
		rangeChange: upgradedSpec.totalRange - currentSpec.totalRange,
		speedChange: upgradedSpec.speed - currentSpec.speed,
		hillSpeedChange: upgradedSpec.hillSpeed - currentSpec.hillSpeed,
		powerChange: upgradedSpec.totalWatts - currentSpec.totalWatts,
		chargeTimeChange: upgradedSpec.chargeTime - currentSpec.chargeTime,
		costChange: upgradedSpec.costPer100km - currentSpec.costPer100km,
		accelChange: upgradedSpec.accelScore - currentSpec.accelScore,
		ampsChange: upgradedSpec.amps - currentSpec.amps,
		cRateChange: upgradedSpec.cRate - currentSpec.cRate,
		whPercent: safePercent(currentSpec.wh, upgradedSpec.wh),
		rangePercent: safePercent(currentSpec.totalRange, upgradedSpec.totalRange),
		speedPercent: safePercent(currentSpec.speed, upgradedSpec.speed),
		hillSpeedPercent: safePercent(currentSpec.hillSpeed, upgradedSpec.hillSpeed),
		powerPercent: safePercent(currentSpec.totalWatts, upgradedSpec.totalWatts),
		chargeTimePercent: safePercent(currentSpec.chargeTime, upgradedSpec.chargeTime),
		costPercent: safePercent(currentSpec.costPer100km, upgradedSpec.costPer100km),
		accelPercent: safePercent(currentSpec.accelScore, upgradedSpec.accelScore),
		ampsPercent: safePercent(currentSpec.amps, upgradedSpec.amps),
		cRatePercent: safePercent(currentSpec.cRate, upgradedSpec.cRate),
	};
}

export function getAllUpgrades(
	config: ScooterConfig,
	specStats: PerformanceStats,
	realworldStats: PerformanceStats
): Recommendation[] {
	const allPossible: Recommendation[] = [];
	const currentSpec = specStats;
	const currentRealworld = realworldStats;
	const stats = specStats; // For condition checks

	const upgradeTypes: Recommendation['upgradeType'][] = ['parallel', 'voltage', 'controller', 'motor', 'tires'];

	upgradeTypes.forEach((type) => {
		let title = '';
		let reason = '';
		let whatChanges = '';
		let expectedGains = { spec: '', realworld: '' };
		let tradeoffs = '';
		let confidence: Recommendation['confidence'] = 'low';
		let estimatedCost = '';
		let difficulty: Recommendation['difficulty'] = 'hard';

		const upgradedConfig = simulateUpgrade(config, type);
		const upgradedSpec = calculatePerformance(upgradedConfig, 'spec');
		const upgradedRealworld = calculatePerformance(upgradedConfig, 'realworld');

		switch (type) {
			case 'parallel':
				title = 'Add Parallel Battery';
				reason =
					stats.cRate <= 2.0 && stats.totalRange >= 50
						? `Battery C-rate (${stats.cRate.toFixed(1)}C) is within safe limits and range (${stats.totalRange.toFixed(0)} km) is adequate. Not a priority upgrade.`
						: `Battery C-rate (${stats.cRate.toFixed(1)}C) ${stats.cRate > 2.0 ? 'exceeds safe limits, causing voltage sag.' : 'is OK, but'} range (${stats.totalRange.toFixed(0)} km) ${stats.totalRange < 50 ? 'is below average — a second pack would help significantly.' : 'could still benefit from extra capacity.'}`;
				whatChanges = 'Doubles battery capacity, halves C-rate, significantly reduces voltage sag.';
				expectedGains = {
					spec: `+${((upgradedSpec.totalRange / currentSpec.totalRange - 1) * 100).toFixed(0)}% range`,
					realworld: `+${((upgradedRealworld.totalRange / currentRealworld.totalRange - 1) * 100).toFixed(0)}% range`,
				};
				tradeoffs = 'Increases weight by ~8-12kg.';
				estimatedCost = '$300-600';
				difficulty = 'moderate';
				confidence = stats.cRate > 2.0 || stats.totalRange < 50 ? 'high' : 'low';
				break;
			case 'voltage':
				title = 'Voltage Boost (+20%)';
				reason =
					config.v >= 72
						? `Already running ${config.v}V — high enough that further overvolting risks motor damage.`
						: `Current ${config.v}V limits top speed to ${stats.speed.toFixed(0)} km/h. A 20% voltage boost would increase RPM and torque for noticeably higher speed.`;
				whatChanges = 'Increases motor RPM and torque for higher top speed.';
				expectedGains = {
					spec: `+${((upgradedSpec.speed / currentSpec.speed - 1) * 100).toFixed(0)}% top speed`,
					realworld: `+${((upgradedRealworld.speed / currentRealworld.speed - 1) * 100).toFixed(0)}% top speed`,
				};
				tradeoffs = 'Requires new controller and charger.';
				estimatedCost = '$200-500';
				difficulty = 'hard';
				confidence = config.v < 72 ? 'medium' : 'low';
				break;
			case 'controller':
				title = 'High-Amp Controller';
				reason = !config.controller
					? 'No controller limit configured — motors already have unrestricted power delivery.'
					: `Controller (${config.controller}A) is restricting motor output. Removing this bottleneck allows full power delivery.`;
				whatChanges = 'Allows motors to reach higher peak power output.';
				expectedGains = {
					spec: `+${((upgradedSpec.totalWatts / currentSpec.totalWatts - 1) * 100).toFixed(0)}% peak power`,
					realworld: 'Better acceleration',
				};
				tradeoffs = 'Higher battery stress. Check thermal limits.';
				estimatedCost = '$150-300';
				difficulty = 'moderate';
				confidence = config.controller ? 'high' : 'low';
				break;
			case 'motor':
				title = 'Dual High-Power Motors';
				reason =
					config.motors >= 2
						? `Already running ${config.motors} motors — adding more would require frame modification.`
						: `Single motor limits acceleration (${stats.accelScore.toFixed(0)}/100) and hill performance. Dual motors improve traction and power delivery.`;
				whatChanges = 'Adds/Upgrades motors for dual-drive traction.';
				expectedGains = {
					spec: `+${(upgradedSpec.accelScore - currentSpec.accelScore).toFixed(0)} accel score`,
					realworld: 'Improved hill climbing',
				};
				tradeoffs = 'Higher consumption. Needs dual controllers.';
				estimatedCost = '$400-800';
				difficulty = 'hard';
				confidence = config.motors < 2 ? 'medium' : 'low';
				break;
			case 'tires':
				title = 'Low-Rolling Tires';
				reason =
					config.rollingResistance !== undefined && config.rollingResistance < 0.015
						? 'Already using low-resistance tires — minimal further gains available.'
						: `Current tires have higher rolling resistance (${(config.rollingResistance ?? 0.02).toFixed(3)}). Switching to street-performance tires reduces energy lost to rolling resistance.`;
				whatChanges = 'Switch to high-performance low-resistance tires.';
				expectedGains = {
					spec: `+${((upgradedSpec.totalRange / currentSpec.totalRange - 1) * 100).toFixed(0)}% range`,
					realworld: `+${((upgradedRealworld.totalRange / currentRealworld.totalRange - 1) * 100).toFixed(0)}% range`,
				};
				tradeoffs = 'Reduced off-road grip.';
				estimatedCost = '$80-150';
				difficulty = 'easy';
				confidence = config.rollingResistance === undefined || config.rollingResistance >= 0.015 ? 'medium' : 'low';
				break;
		}

		allPossible.push({
			upgradeType: type,
			title,
			reason,
			whatChanges,
			expectedGains,
			tradeoffs,
			confidence,
			estimatedCost,
			difficulty,
		});
	});

	return allPossible;
}
