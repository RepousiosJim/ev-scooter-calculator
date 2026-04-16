import type { Recommendation, ScooterConfig, PerformanceStats } from '$lib/types';
import { calculatePerformance } from './calculator';
import { NOMINAL_VOLTAGE } from '$lib/constants/physics';

export function generateRecommendations(
	config: ScooterConfig,
	specStats: PerformanceStats,
	realworldStats: PerformanceStats
): Recommendation[] {
	const recommendations: Recommendation[] = [];
	const stats = specStats; // For condition checks that use stats parameter

	// Parallel Battery: C-rate stress OR limited range
	if (stats.cRate > 2.0 || stats.totalRange < 50) {
		const parallelConfig: ScooterConfig = { ...config, ah: config.ah * 2 };
		const parallelSpec = calculatePerformance(parallelConfig, 'spec');
		const parallelRealworld = calculatePerformance(parallelConfig, 'realworld');

		recommendations.push({
			upgradeType: 'parallel',
			title: 'Add Parallel Battery',
			reason:
				stats.cRate > 2.0
					? `Battery C-rate (${stats.cRate.toFixed(1)}C) exceeds safe limits, causing voltage sag.`
					: `Range (${stats.totalRange.toFixed(0)} km) is limited by battery capacity.`,
			whatChanges: 'Doubles battery capacity, halves C-rate, significantly reduces voltage sag.',
			expectedGains: {
				spec: `+${((parallelSpec.totalRange / specStats.totalRange - 1) * 100).toFixed(0)}% range, ${(parallelSpec.cRate / specStats.cRate).toFixed(2)}x lower C-rate`,
				realworld: `+${((parallelRealworld.totalRange / realworldStats.totalRange - 1) * 100).toFixed(0)}% range, ${(parallelRealworld.cRate / realworldStats.cRate).toFixed(2)}x lower C-rate`,
			},
			tradeoffs: 'Increases weight by ~8-12kg. Requires battery enclosure modification.',
			confidence: 'high',
			estimatedCost: '$300-600',
			difficulty: 'moderate',
		});
	}

	// Voltage Boost: low speed or low acceleration with room to overvolt
	if (stats.speed < 60 && config.v < 72) {
		const voltageConfig: ScooterConfig = {
			...config,
			v: Math.round(config.v * 1.2),
			watts: Math.round(config.watts * 1.2),
		};
		const voltageSpec = calculatePerformance(voltageConfig, 'spec');
		const voltageRealworld = calculatePerformance(voltageConfig, 'realworld');

		recommendations.push({
			upgradeType: 'voltage',
			title: 'Voltage Boost (+20%)',
			reason: `Top speed (${stats.speed.toFixed(0)} km/h) could be improved with higher voltage.`,
			whatChanges: 'Increases motor RPM and torque for higher top speed and better acceleration.',
			expectedGains: {
				spec: `+${((voltageSpec.speed / specStats.speed - 1) * 100).toFixed(0)}% top speed, +${(voltageSpec.accelScore - specStats.accelScore).toFixed(0)} accel`,
				realworld: `+${((voltageRealworld.speed / realworldStats.speed - 1) * 100).toFixed(0)}% top speed, +${(voltageRealworld.accelScore - realworldStats.accelScore).toFixed(0)} accel`,
			},
			tradeoffs: 'Requires new controller (matched to voltage). Check motor voltage rating.',
			confidence: 'medium',
			estimatedCost: '$200-500',
			difficulty: 'hard',
		});
	}

	// Controller Upgrade: controller is bottlenecking power
	if (config.controller && config.controller < (stats.totalWatts / config.v) * 0.8) {
		recommendations.push({
			upgradeType: 'controller',
			title: 'High-Amp Controller',
			reason: `Current ${config.controller}A controller limits motor output to ${(config.controller * config.v).toFixed(0)}W vs ${stats.totalWatts.toFixed(0)}W potential.`,
			whatChanges: 'Allows motors to reach full power output for better acceleration and hill climbing.',
			expectedGains: {
				spec: `+${(((config.motors * config.watts * (config.v / NOMINAL_VOLTAGE) - config.controller * config.v) / (config.controller * config.v)) * 100).toFixed(0)}% power output`,
				realworld: 'Improved acceleration and hill climbing in real-world conditions',
			},
			tradeoffs: 'May require thicker gauge wiring. Check motor thermal limits.',
			confidence: 'high',
			estimatedCost: '$150-300',
			difficulty: 'moderate',
		});
	}

	// Dual Motors: single motor with weak acceleration
	if (stats.accelScore < 50 && config.motors === 1) {
		const motorConfig: ScooterConfig = { ...config, motors: 2, watts: config.watts * 1.5 };
		const motorSpec = calculatePerformance(motorConfig, 'spec');
		const motorRealworld = calculatePerformance(motorConfig, 'realworld');

		recommendations.push({
			upgradeType: 'motor',
			title: 'Dual High-Power Motors',
			reason: `Single ${config.watts}W motor provides ${stats.accelScore < 40 ? 'weak' : 'moderate'} acceleration (${stats.accelScore.toFixed(0)}/100).`,
			whatChanges: 'Adds second motor with higher wattage for dual-drive traction.',
			expectedGains: {
				spec: `+${(motorSpec.accelScore - specStats.accelScore).toFixed(0)} acceleration score, better hill climbing`,
				realworld: `+${(motorRealworld.accelScore - realworldStats.accelScore).toFixed(0)} acceleration score, improved traction`,
			},
			tradeoffs: 'Higher power consumption reduces range. May require controller upgrade.',
			confidence: 'medium',
			estimatedCost: '$400-800',
			difficulty: 'hard',
		});
	}

	// Low-Rolling Tires: standard or off-road rolling resistance
	if (config.rollingResistance === undefined || config.rollingResistance >= 0.015) {
		const tireConfig: ScooterConfig = { ...config, rollingResistance: 0.012 };
		const tireSpec = calculatePerformance(tireConfig, 'spec');

		const rangeGain = ((tireSpec.totalRange / specStats.totalRange - 1) * 100).toFixed(0);

		recommendations.push({
			upgradeType: 'tires',
			title: 'Low-Rolling Tires',
			reason: 'Switching to street-performance tires reduces energy lost to rolling resistance.',
			whatChanges: 'Switch to low-rolling-resistance tires for improved efficiency.',
			expectedGains: {
				spec: `+${rangeGain}% range from reduced rolling resistance`,
				realworld: `+${rangeGain}% real-world range, smoother ride quality`,
			},
			tradeoffs: 'Low-profile tires may have reduced comfort and off-road capability.',
			confidence: 'low',
			estimatedCost: '$80-150',
			difficulty: 'easy',
		});
	}

	return recommendations;
}
