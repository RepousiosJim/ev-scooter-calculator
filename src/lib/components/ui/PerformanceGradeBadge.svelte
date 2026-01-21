<script lang="ts">
  import { scale } from "svelte/transition";

  type Grade =
    | "A+"
    | "A"
    | "A-"
    | "B+"
    | "B"
    | "B-"
    | "C+"
    | "C"
    | "C-"
    | "D+"
    | "D"
    | "F";

  let {
    grade,
    trend,
    size = "md",
    showTrend = true,
  }: {
    grade: Grade;
    trend?: "up" | "down" | "neutral";
    size?: "sm" | "md" | "lg";
    showTrend?: boolean;
  } = $props();

  const sizeConfig = {
    sm: { padding: "px-3 py-1.5", text: "text-lg" },
    md: { padding: "px-4 py-2", text: "text-2xl" },
    lg: { padding: "px-6 py-3", text: "text-4xl" },
  };

  const gradeColor = $derived(() => {
    const firstChar = grade.charAt(0);
    if (firstChar === "A")
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/20";
    if (firstChar === "B")
      return "bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-blue-500/20";
    if (firstChar === "C")
      return "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/20";
    if (firstChar === "D")
      return "bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-orange-500/20";
    return "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-500/20";
  });

  const trendIcon = $derived(() => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "→";
    }
  });

  const trendColor = $derived(() => {
    switch (trend) {
      case "up":
        return "text-success";
      case "down":
        return "text-danger";
      default:
        return "text-text-secondary";
    }
  });

  const config = $derived(() => sizeConfig[size]);
</script>

<div class="inline-flex items-center gap-3">
  <!-- Grade Badge -->
  <div
    transition:scale={{ duration: 400, easing: (t) => Math.pow(t, 0.5) }}
    class="inline-flex items-center justify-center {config()
      .padding} rounded-xl shadow-lg {gradeColor()
      .split(' ')
      .slice(0, 3)
      .join(' ')} font-black font-display {config()
      .text} border-2 {gradeColor().split(
      ' ',
    )[3]} shadow-[0_0_20px_-5px] {gradeColor().split(' ')[4]}"
    role="img"
    aria-label={`Performance grade: ${grade}`}
  >
    {grade}
  </div>

  <!-- Trend Indicator -->
  {#if showTrend && trend}
    <div
      transition:scale
      class="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 {trendColor()}"
      aria-label={`Trend: ${trend}`}
    >
      <span class="text-sm" aria-hidden="true">{trendIcon()}</span>
      <span class="text-xs font-medium uppercase">
        {trend === "up" ? "Improved" : trend === "down" ? "Declined" : "Stable"}
      </span>
    </div>
  {/if}
</div>
