<script lang="ts">
  import { calculatorState } from "$lib/stores/calculator.svelte";
  import { onMount } from "svelte";

  const config = $derived(calculatorState.config);
  const stats = $derived(calculatorState.stats);

  let canvas: HTMLCanvasElement;

  function drawGraph() {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      const y = padding + (i / 10) * (height - 2 * padding);
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

    // Curve (Placeholder for now, logic simplified)
    ctx.strokeStyle = "var(--color-primary)";
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    for (let x = 0; x <= 100; x++) {
      const px = padding + (x / 100) * (width - 2 * padding);
      const py =
        height - padding - Math.pow(x / 100, 3) * (height - 2 * padding) * 0.8;
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Speed (km/h)", width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Power (W)", 0, 0);
    ctx.restore();
  }

  $effect(() => {
    drawGraph();
  });

  onMount(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        canvas.width = canvas.parentElement?.clientWidth || 800;
        canvas.height = 300;
        drawGraph();
      }
    });
    resizeObserver.observe(canvas.parentElement!);
    return () => resizeObserver.disconnect();
  });
</script>

<div
  class="bg-bg-secondary rounded-2xl border border-white/5 p-6 shadow-sm overflow-hidden space-y-4"
>
  <div class="flex items-center justify-between px-1">
    <h3 class="text-xs font-bold text-text-secondary uppercase tracking-widest">
      Power vs Speed Curve
    </h3>
    <span class="text-[10px] text-text-tertiary">Unit: Watts / Velocity</span>
  </div>

  <div class="relative aspect-[3/1] min-h-[300px]">
    <canvas bind:this={canvas} class="w-full h-full"></canvas>
  </div>
</div>
