<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { calculatorState } from '$lib/stores/calculator.svelte';
  import { AIR_DENSITY, ROLLING_RESISTANCE } from '$lib/utils/physics';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;
  let container: HTMLDivElement;

  const stats = $derived(calculatorState.stats);
  const config = $derived(calculatorState.config);

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d')!;
      resizeCanvas();
      startAnimationLoop();
    }

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  });

  function resizeCanvas() {
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = 300 * dpr;

    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '300px';
  }

  function startAnimationLoop() {
    function animate() {
      drawGraph();
      animationId = requestAnimationFrame(animate);
    }
    animate();
  }

  function drawGraph() {
    if (!ctx || !canvas) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = 300;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Speed (km/h)', width / 2, height - 5);

    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Power (W)', 0, 0);
    ctx.restore();

    // Calculate scales
    const maxSpeed = Math.ceil(stats.speed / 10) * 10;
    const maxPower = Math.max(stats.totalWatts * 1.2, 1000);

    // Draw grid lines
    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#64748b';

    // Horizontal grid
    for (let i = 0; i <= 5; i++) {
      const y = height - padding - (i / 5) * graphHeight;
      ctx.textAlign = 'right';
      ctx.fillText(Math.round((i / 5) * maxPower).toString(), padding - 5, y + 3);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical grid
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * graphWidth;
      ctx.textAlign = 'center';
      ctx.fillText(Math.round((i / 5) * maxSpeed).toString(), x, height - padding + 15);
      ctx.beginPath();
      ctx.moveTo(x, height - padding);
      ctx.lineTo(x, padding);
      ctx.stroke();
    }

    // Draw available power line
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Available Power', width - padding - 50, height - padding - 5);

    // Draw required power curve
    ctx.strokeStyle = '#7000ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let firstPoint = true;
    for (let v = 0; v <= maxSpeed; v += 1) {
      const speedMps = v / 3.6;
      const powerDrag = 0.5 * AIR_DENSITY * Math.pow(speedMps, 3) * config.ridePosition;
      const totalPowerNeeded = powerDrag + ROLLING_RESISTANCE;

      const x = padding + (v / maxSpeed) * graphWidth;
      const y = height - padding - (totalPowerNeeded / maxPower) * graphHeight;

      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw gradient fill under curve
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(112, 0, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(112, 0, 255, 0.05)');

    ctx.beginPath();
    ctx.moveTo(padding, height - padding - (ROLLING_RESISTANCE / maxPower) * graphHeight);
    for (let v = 0; v <= maxSpeed; v += 1) {
      const speedMps = v / 3.6;
      const powerDrag = 0.5 * AIR_DENSITY * Math.pow(speedMps, 3) * config.ridePosition;
      const totalPowerNeeded = powerDrag + ROLLING_RESISTANCE;

      const x = padding + (v / maxSpeed) * graphWidth;
      const y = height - padding - (totalPowerNeeded / maxPower) * graphHeight;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw equilibrium point (pulsing)
    const equilibriumX = padding + (stats.speed / maxSpeed) * graphWidth;
    const equilibriumY = height - padding - (stats.totalWatts / maxPower) * graphHeight;

    const time = Date.now() / 1000;
    const glowSize = 6 + Math.sin(time * 4) * 3;
    const glowAlpha = 0.3 + Math.sin(time * 4) * 0.2;

    ctx.beginPath();
    ctx.arc(equilibriumX, equilibriumY, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(16, 185, 129, ${glowAlpha})`;
    ctx.fill();

    // Draw equilibrium point
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(equilibriumX, equilibriumY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Top Speed: ${stats.speed.toFixed(1)} km/h`, equilibriumX + 10, equilibriumY - 5);
  }
</script>

<div
  bind:this={container}
  class="bg-black/20 p-4 rounded-lg mt-5"
>
  <div class="text-center font-bold mb-3 text-textMuted">Power vs Speed Curve</div>
  <canvas
    bind:this={canvas}
    class="w-full rounded-lg"
    style="background: #0f172a;"
  ></canvas>
</div>
