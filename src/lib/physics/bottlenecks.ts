import type { Bottleneck, PerformanceStats, ScooterConfig } from '$lib/types';

export function detectBottlenecks(
  stats: PerformanceStats,
  config: ScooterConfig
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  if (stats.cRate > 3.0) {
    bottlenecks.push({
      type: 'SAG_WARNING',
      message: 'Battery discharge is too high. Expect voltage sag and reduced performance.',
      upgrade: 'parallel'
    });
  }

  if (config.controller && config.controller < (stats.totalWatts / config.v)) {
    bottlenecks.push({
      type: 'CONTROLLER_LIMIT',
      message: 'Controller amp limit is restricting motor power output.',
      upgrade: 'controller'
    });
  }

  if (stats.speed < 45 && config.v > 48 && stats.accelScore < 50) {
    bottlenecks.push({
      type: 'GEAR_RATIO_LIMIT',
      message: 'Low speed despite high voltage — likely a gear ratio or motor KV limitation.',
      upgrade: 'motor'
    });
  }

  if (stats.hillSpeed < 10 && config.slope > 5) {
    bottlenecks.push({
      type: 'HILL_CLIMB_LIMIT',
      message: 'Poor hill climbing performance. More power or gearing needed.',
      upgrade: 'voltage'
    });
  }

  return bottlenecks;
}
