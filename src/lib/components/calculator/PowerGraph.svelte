<script lang="ts">
  import { calculatorState } from "$lib/stores/calculator.svelte";
  import { onMount } from "svelte";
  import { speedVal, speedUnit } from "$lib/utils/units";

  const config = $derived(calculatorState.config);
  const stats = $derived(calculatorState.stats);

  let canvas: HTMLCanvasElement;
  let isMobile = $state(false);

  const canvasHeight = $derived(isMobile ? 400 : 300);

  /**
   * Generate power-vs-speed curve from actual config.
   * Model: power rises linearly from 0 to peak watts (limited by controller),
   * then rolls off as back-EMF approaches supply voltage near top speed.
   */
  function generatePowerCurve(): { speed: number; power: number }[] {
    const topSpeed = stats.speed; // km/h
    const peakWatts = stats.totalWatts;
    const controllerAmps = config.controller ?? (peakWatts / config.v);
    const maxControllerPower = controllerAmps * config.v;
    const effectivePeak = Math.min(peakWatts, maxControllerPower);

    const points: { speed: number; power: number }[] = [];
    const steps = 50;

    for (let i = 0; i <= steps; i++) {
      const speedFraction = i / steps;
      const currentSpeed = speedFraction * topSpeed * 1.05; // extend slightly past top speed

      // Back-EMF fraction (0 at standstill, 1 at top speed)
      const bemfFraction = topSpeed > 0 ? currentSpeed / topSpeed : 0;

      // Available torque decreases linearly with back-EMF
      const torqueFactor = Math.max(0, 1 - bemfFraction);

      // Power = torque * speed, capped at effective peak
      let power = torqueFactor * effectivePeak * (bemfFraction > 0 ? bemfFraction / (1 - bemfFraction + bemfFraction) : 0);

      // Simplified: power rises, peaks around 60-70% of top speed, then drops
      // P = V * I * (1 - bemf_ratio) * speed_ratio, normalized
      // More intuitive: power = peak * 4 * s * (1 - s) where s = speed/topSpeed
      const s = Math.min(bemfFraction, 1);
      power = effectivePeak * 4 * s * (1 - s);

      // Clamp
      power = Math.max(0, Math.min(power, effectivePeak));

      points.push({ speed: currentSpeed, power });
    }

    return points;
  }

  function drawGraph() {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = isMobile ? 52 : 44;

    ctx.clearRect(0, 0, width, height);

    const curve = generatePowerCurve();
    const maxSpeed = Math.max(...curve.map(p => p.speed), 1);
    const maxPower = Math.max(...curve.map(p => p.power), 1);

    // Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      const y = padding + (i / 5) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Axis tick labels
    const fontSize = isMobile ? 11 : 10;
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = `${fontSize}px Inter, sans-serif`;

    // X-axis ticks (speed)
    ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      const speedKmh = (i / 5) * maxSpeed;
      const displaySpeed = Math.round(speedVal(speedKmh));
      const x = padding + (i / 5) * (width - 2 * padding);
      ctx.fillText(`${displaySpeed}`, x, height - padding + 16);
    }

    // Y-axis ticks (power)
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const power = (i / 4) * maxPower;
      const y = height - padding - (i / 4) * (height - 2 * padding);
      ctx.fillText(`${Math.round(power)}`, padding - 6, y + 4);
    }

    // Power curve
    ctx.strokeStyle = "var(--color-primary)";
    ctx.lineWidth = isMobile ? 3 : 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let started = false;
    for (const point of curve) {
      const px = padding + (point.speed / maxSpeed) * (width - 2 * padding);
      const py = height - padding - (point.power / maxPower) * (height - 2 * padding);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(padding + (curve[curve.length - 1].speed / maxSpeed) * (width - 2 * padding), height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = "rgba(56, 189, 248, 0.06)";
    ctx.fill();

    // Peak power marker
    const peakPoint = curve.reduce((a, b) => b.power > a.power ? b : a, curve[0]);
    const peakX = padding + (peakPoint.speed / maxSpeed) * (width - 2 * padding);
    const peakY = height - padding - (peakPoint.power / maxPower) * (height - 2 * padding);

    ctx.beginPath();
    ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "var(--color-primary)";
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(peakPoint.power)}W @ ${Math.round(speedVal(peakPoint.speed))} ${speedUnit()}`, peakX + 8, peakY - 6);

    // Axis labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`Speed (${speedUnit()})`, width / 2, height - (isMobile ? 4 : 6));

    ctx.save();
    ctx.translate(isMobile ? 14 : 12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Power (W)", 0, 0);
    ctx.restore();
  }

  function checkMobile() {
    isMobile = window.innerWidth < 768;
  }

  $effect(() => {
    // Redraw when config/stats change
    void config.v;
    void config.watts;
    void config.motors;
    void config.controller;
    void stats.speed;
    void stats.totalWatts;
    if (canvas) {
      canvas.height = canvasHeight;
      drawGraph();
    }
  });

  onMount(() => {
    checkMobile();

    const handleResize = () => {
      checkMobile();
      if (canvas) {
        canvas.width = canvas.parentElement?.clientWidth || 800;
        canvas.height = canvasHeight;
        drawGraph();
      }
    };

    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        canvas.width = canvas.parentElement?.clientWidth || 800;
        canvas.height = canvasHeight;
        drawGraph();
      }
    });
    resizeObserver.observe(canvas.parentElement!);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  });
</script>

<div
  class="bg-bg-secondary rounded-2xl border border-white/5 p-6 shadow-sm overflow-hidden space-y-4"
>
  <div class="flex items-center justify-between px-1">
    <h3 class="text-xs font-bold text-text-secondary uppercase tracking-widest">
      Power vs Speed Curve
    </h3>
    <span class="text-[10px] text-text-tertiary">Peak: {stats.totalWatts}W @ {Math.round(speedVal(stats.speed * 0.65))} {speedUnit()}</span>
  </div>

  <div class="relative min-h-[400px] md:min-h-[300px]">
    <canvas bind:this={canvas} class="w-full h-full"></canvas>
  </div>
</div>
