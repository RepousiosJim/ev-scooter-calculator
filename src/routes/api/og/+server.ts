import type { RequestHandler } from './$types';
import { read } from '$app/server';
import satori, { type Font as SatoriFont } from 'satori';
// Assets are imported with ?url and loaded via read() so the build bundles them
// into the serverless function. Satori needs TTF/OTF/WOFF (not WOFF2); these are
// Inter (OFL, see fonts/OFL.txt) subset to Latin. The resvg wasm binary is not
// traced into the Vercel function by a plain require.resolve, so it is loaded
// the same way.
import inter400Url from '$lib/server/og/fonts/inter-400.ttf?url';
import inter700Url from '$lib/server/og/fonts/inter-700.ttf?url';
import inter900Url from '$lib/server/og/fonts/inter-900.ttf?url';
import resvgWasmUrl from '@resvg/resvg-wasm/index_bg.wasm?url';

export const config = { maxDuration: 15 };
import { applyRateLimit } from '$lib/server/api-helpers';
import { presets, presetMetadata } from '$lib/data/presets';
import { calculatePerformance } from '$lib/physics/calculator';
import { computeScore, getGradeInfo } from '$lib/utils/scoring';

// ---------------------------------------------------------------------------
// Font cache — loaded once per server cold-start, reused for every request.
// ---------------------------------------------------------------------------
let fontDataRegular: ArrayBuffer | null = null;
let fontDataBold: ArrayBuffer | null = null;
let fontDataBlack: ArrayBuffer | null = null;

async function loadFonts(): Promise<void> {
	if (fontDataRegular && fontDataBold && fontDataBlack) return;

	const [regular, bold, black] = await Promise.all(
		[inter400Url, inter700Url, inter900Url].map((url) => read(url).arrayBuffer())
	);

	fontDataRegular = regular;
	fontDataBold = bold;
	fontDataBlack = black;
}

// ---------------------------------------------------------------------------
// WASM init — only attempt once, track success so we can fall back to SVG.
// ---------------------------------------------------------------------------
let wasmReady = false;
let wasmAttempted = false;

async function initWasm(): Promise<boolean> {
	if (wasmAttempted) return wasmReady;
	wasmAttempted = true;
	try {
		const { initWasm: init } = await import('@resvg/resvg-wasm');
		await init(await read(resvgWasmUrl).arrayBuffer());
		wasmReady = true;
	} catch (err) {
		console.error('[og] resvg wasm init failed; serving SVG fallback:', err);
		wasmReady = false;
	}
	return wasmReady;
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------
const W = 1200;
const H = 630;
const BG = '#030712';
const CYAN = '#22d3ee';
const WHITE = '#f1f5f9';
const MUTED = '#94a3b8';
const CARD_BG = '#0f172a';
const BORDER = '#1e293b';

function statBox(label: string, value: string, unit: string) {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column' as const,
				alignItems: 'center',
				justifyContent: 'center',
				background: CARD_BG,
				border: `1px solid ${BORDER}`,
				borderRadius: '12px',
				padding: '20px 16px',
				flex: 1,
				gap: '4px',
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							color: MUTED,
							fontSize: 13,
							fontWeight: 400,
							textTransform: 'uppercase' as const,
							letterSpacing: '0.1em',
						},
						children: label,
					},
				},
				{
					type: 'div',
					props: {
						style: { display: 'flex', alignItems: 'baseline', gap: '3px' },
						children: [
							{
								type: 'div',
								props: {
									style: { color: WHITE, fontSize: 28, fontWeight: 700 },
									children: value,
								},
							},
							{
								type: 'div',
								props: {
									style: { color: MUTED, fontSize: 13, fontWeight: 400 },
									children: unit,
								},
							},
						],
					},
				},
			],
		},
	};
}

function buildCard(
	scooterName: string,
	year: number | null,
	score: number,
	grade: string,
	gradeLabel: string,
	gradeColor: string,
	speed: number,
	range: number,
	power: number,
	price: number | null
) {
	const scoreStr = score.toFixed(1);
	const speedStr = Math.round(speed).toString();
	const rangeStr = Math.round(range).toString();
	const powerStr = power >= 1000 ? `${(power / 1000).toFixed(1)}k` : Math.round(power).toString();
	const priceStr = price != null ? `$${price >= 1000 ? `${(price / 1000).toFixed(1)}k` : price}` : 'N/A';

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column' as const,
				width: '100%',
				height: '100%',
				background: BG,
				padding: '52px 60px',
				fontFamily: 'Inter',
				boxSizing: 'border-box' as const,
				position: 'relative' as const,
			},
			children: [
				// ---- Top bar: brand + year pill ----
				{
					type: 'div',
					props: {
						style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
						children: [
							{
								type: 'div',
								props: {
									style: { display: 'flex', alignItems: 'center', gap: '10px' },
									children: [
										{
											type: 'div',
											props: {
												style: {
													width: '8px',
													height: '8px',
													borderRadius: '50%',
													background: CYAN,
												},
												children: '',
											},
										},
										{
											type: 'div',
											props: {
												style: {
													color: CYAN,
													fontSize: 14,
													fontWeight: 700,
													letterSpacing: '0.15em',
													textTransform: 'uppercase' as const,
												},
												children: 'EV SCOOTER PRO',
											},
										},
									],
								},
							},
							year != null
								? {
										type: 'div',
										props: {
											style: {
												background: CARD_BG,
												border: `1px solid ${BORDER}`,
												borderRadius: '6px',
												padding: '4px 12px',
												color: MUTED,
												fontSize: 13,
												fontWeight: 400,
											},
											children: year.toString(),
										},
									}
								: { type: 'div', props: { style: { display: 'none' }, children: '' } },
						],
					},
				},

				// ---- Scooter name ----
				{
					type: 'div',
					props: {
						style: {
							color: WHITE,
							fontSize: scooterName.length > 28 ? 44 : 56,
							fontWeight: 900,
							marginTop: '20px',
							lineHeight: 1.1,
						},
						children: scooterName,
					},
				},

				// ---- Score + grade ----
				{
					type: 'div',
					props: {
						style: { display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' },
						children: [
							// Grade badge
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: '72px',
										height: '72px',
										borderRadius: '12px',
										background: gradeColor + '22', // 13% opacity
										border: `2px solid ${gradeColor}`,
										color: gradeColor,
										fontSize: 36,
										fontWeight: 900,
									},
									children: grade,
								},
							},
							// Score details
							{
								type: 'div',
								props: {
									style: { display: 'flex', flexDirection: 'column' as const, gap: '2px' },
									children: [
										{
											type: 'div',
											props: {
												style: { display: 'flex', alignItems: 'baseline', gap: '4px' },
												children: [
													{
														type: 'div',
														props: {
															style: { color: WHITE, fontSize: 40, fontWeight: 900 },
															children: scoreStr,
														},
													},
													{
														type: 'div',
														props: {
															style: { color: MUTED, fontSize: 18, fontWeight: 400 },
															children: '/ 100',
														},
													},
												],
											},
										},
										{
											type: 'div',
											props: {
												style: {
													color: gradeColor,
													fontSize: 13,
													fontWeight: 700,
													letterSpacing: '0.1em',
													textTransform: 'uppercase' as const,
												},
												children: gradeLabel,
											},
										},
									],
								},
							},
						],
					},
				},

				// ---- Spacer ----
				{
					type: 'div',
					props: { style: { flex: 1 }, children: '' },
				},

				// ---- Stats row ----
				{
					type: 'div',
					props: {
						style: { display: 'flex', gap: '12px', width: '100%' },
						children: [
							statBox('Top Speed', speedStr, 'km/h'),
							statBox('Range', rangeStr, 'km'),
							statBox('Peak Power', powerStr, 'W'),
							statBox('Price', priceStr, ''),
						],
					},
				},

				// ---- Footer divider ----
				{
					type: 'div',
					props: {
						style: {
							marginTop: '28px',
							paddingTop: '16px',
							borderTop: `1px solid ${BORDER}`,
							color: MUTED,
							fontSize: 12,
							fontWeight: 400,
						},
						children: 'evscooterpro.com · Performance data based on physics simulation',
					},
				},
			],
		},
	};
}

function defaultCard() {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column' as const,
				alignItems: 'center',
				justifyContent: 'center',
				width: '100%',
				height: '100%',
				background: BG,
				fontFamily: 'Inter',
				gap: '20px',
				padding: '60px',
			},
			children: [
				{
					type: 'div',
					props: {
						style: { display: 'flex', alignItems: 'center', gap: '12px' },
						children: [
							{
								type: 'div',
								props: {
									style: { width: '10px', height: '10px', borderRadius: '50%', background: CYAN },
									children: '',
								},
							},
							{
								type: 'div',
								props: {
									style: {
										color: CYAN,
										fontSize: 16,
										fontWeight: 700,
										letterSpacing: '0.15em',
										textTransform: 'uppercase' as const,
									},
									children: 'EV SCOOTER PRO',
								},
							},
						],
					},
				},
				{
					type: 'div',
					props: {
						style: { color: WHITE, fontSize: 64, fontWeight: 900, textAlign: 'center' as const, lineHeight: 1.1 },
						children: 'EV Scooter Pro Calculator',
					},
				},
				{
					type: 'div',
					props: {
						style: { color: MUTED, fontSize: 24, fontWeight: 400, textAlign: 'center' as const, maxWidth: '700px' },
						children: 'Performance analysis, upgrade simulation & rankings for electric scooters',
					},
				},
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							gap: '12px',
							marginTop: '8px',
						},
						children: [
							{ label: 'Rankings', color: CYAN },
							{ label: 'Range Calc', color: '#10b981' },
							{ label: 'Upgrade Sim', color: '#a855f7' },
						].map(({ label, color }) => ({
							type: 'div',
							props: {
								style: {
									background: color + '22',
									border: `1px solid ${color}`,
									borderRadius: '6px',
									padding: '6px 16px',
									color,
									fontSize: 14,
									fontWeight: 600,
								},
								children: label,
							},
						})),
					},
				},
			],
		},
	};
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	const { limited } = await applyRateLimit(getClientAddress(), false);
	if (limited) return limited;
	const scooterKey = url.searchParams.get('scooter') ?? '';

	// ----- Build card data -----
	let node: object;
	let debugName = 'default';

	if (scooterKey && scooterKey in presets && scooterKey !== 'custom') {
		const config = presets[scooterKey];
		const meta = presetMetadata[scooterKey];
		const stats = calculatePerformance(config, 'spec');
		const score = computeScore(config, stats);
		const { grade, label: gradeLabel, color: gradeColor } = getGradeInfo(score);

		const name = meta?.name ?? scooterKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
		const year = meta?.year ?? null;
		const price = meta?.manufacturer?.price ?? null;

		node = buildCard(
			name,
			year,
			score,
			grade,
			gradeLabel,
			gradeColor,
			stats.speed,
			stats.totalRange,
			stats.totalWatts,
			price
		);
		debugName = scooterKey;
	} else {
		node = defaultCard();
	}

	// ----- Load fonts -----
	try {
		await loadFonts();
	} catch {
		// Non-fatal: satori may still work with fewer fonts / we'll use fallback
	}

	const fonts: SatoriFont[] = [];
	if (fontDataRegular) fonts.push({ name: 'Inter', data: fontDataRegular, weight: 400, style: 'normal' });
	if (fontDataBold) fonts.push({ name: 'Inter', data: fontDataBold, weight: 700, style: 'normal' });
	if (fontDataBlack) fonts.push({ name: 'Inter', data: fontDataBlack, weight: 900, style: 'normal' });

	// ----- Generate SVG via satori -----
	let svg: string;
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		svg = await satori(node as any, {
			width: W,
			height: H,
			fonts,
		});
	} catch (err) {
		console.error('[og] satori failed:', err);
		return new Response('Image generation failed', { status: 500 });
	}

	// ----- Attempt PNG conversion via resvg-wasm -----
	const pngReady = await initWasm();

	if (pngReady) {
		try {
			const { Resvg } = await import('@resvg/resvg-wasm');
			const resvg = new Resvg(svg, {
				fitTo: { mode: 'width', value: W },
			});
			const rendered = resvg.render();
			const pngBuffer = rendered.asPng();

			return new Response(pngBuffer.buffer as ArrayBuffer, {
				headers: {
					'Content-Type': 'image/png',
					'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
					'X-OG-Scooter': debugName,
				},
			});
		} catch (err) {
			console.warn('[og] resvg render failed, falling back to SVG:', err);
		}
	}

	// ----- Fallback: serve SVG directly -----
	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
			'X-OG-Scooter': debugName,
		},
	});
};
