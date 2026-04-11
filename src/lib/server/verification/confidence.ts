import type { SourceEntry } from './types';

/**
 * Compute confidence score (0-100) for a spec field based on its sources.
 *
 * Scoring breakdown:
 * - Source count (0-40): more sources = more confidence
 * - Source agreement (0-40): lower variance across sources = higher confidence
 * - Source diversity (0-10): different source types increase confidence
 * - Recency (0-10): more recent data is more trustworthy
 */
export function computeConfidence(sources: SourceEntry[]): number {
	if (sources.length === 0) return 0;

	const countScore = Math.min(40, sources.length * 10);

	let agreementScore = 40; // default to full if only 1 source
	if (sources.length > 1) {
		const values = sources.map((s) => s.value);
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		if (mean > 0) {
			const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
			const stddev = Math.sqrt(variance);
			const cv = stddev / mean; // coefficient of variation
			// CV < 0.02 = full score, linear decline to 0 at CV = 0.20
			agreementScore = Math.max(0, Math.min(40, 40 * (1 - (cv - 0.02) / 0.18)));
		}
	}

	const uniqueTypes = new Set(sources.map((s) => s.type));
	const diversityScore = Math.min(10, uniqueTypes.size <= 1 ? 2 : uniqueTypes.size <= 2 ? 5 : 10);

	const now = Date.now();
	const mostRecent = Math.max(...sources.map((s) => new Date(s.fetchedAt).getTime()));
	const daysSinceRecent = (now - mostRecent) / (1000 * 60 * 60 * 24);
	const recencyScore = Math.max(0, Math.min(10, 10 * (1 - daysSinceRecent / 365)));

	return Math.round(Math.max(0, Math.min(100, countScore + agreementScore + diversityScore + recencyScore)));
}

/**
 * Compute overall confidence for a scooter across all verified fields.
 */
export function computeOverallConfidence(
	fields: Record<string, { confidence: number; sources: SourceEntry[] }>
): number {
	const fieldsWithSources = Object.values(fields).filter((f) => f.sources.length > 0);
	if (fieldsWithSources.length === 0) return 0;
	const sum = fieldsWithSources.reduce((acc, f) => acc + f.confidence, 0);
	return Math.round(sum / fieldsWithSources.length);
}
