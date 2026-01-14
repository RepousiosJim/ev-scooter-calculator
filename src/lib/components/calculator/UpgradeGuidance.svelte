<script lang="ts">
  const guidanceItems = [
    {
      icon: '🔋',
      title: 'Parallel Battery',
      description: 'Adds a second battery in parallel to double capacity.',
      benefits: ['Doubles range', 'Halves C-rate stress', 'Reduces voltage sag'],
      considerations: ['Adds 8-12kg weight', 'Requires battery enclosure modification', 'Ensure matching voltage and chemistry'],
      difficulty: 'moderate'
    },
    {
      icon: '⚡',
      title: 'Voltage Boost',
      description: 'Increases battery voltage for higher motor RPM and torque.',
      benefits: ['+15-20% top speed', 'Better hill climbing', 'Improved acceleration'],
      considerations: ['Requires new controller', 'Check motor voltage rating', 'Higher voltage = higher risk'],
      difficulty: 'hard'
    },
    {
      icon: '🎛️',
      title: 'High-Amp Controller',
      description: 'Upgrades to a controller with higher current limit.',
      benefits: ['Unlocks full motor power', 'Better acceleration', 'Improved hill climbing'],
      considerations: ['May need thicker wiring', 'Check motor thermal limits', 'Verify battery discharge rating'],
      difficulty: 'moderate'
    },
    {
      icon: '🔧',
      title: 'Dual Motors',
      description: 'Adds a second motor for dual-drive traction.',
      benefits: ['2x traction', 'Better acceleration', 'Smoother power delivery'],
      considerations: ['Higher power consumption', 'Requires dual-motor controller', 'Reduces range by ~15%'],
      difficulty: 'hard'
    },
    {
      icon: '🛞',
      title: 'Low-Rolling Tires',
      description: 'Switches to tires with lower rolling resistance.',
      benefits: ['+5-10% range improvement', 'Smoother ride', 'Reduced energy waste'],
      considerations: ['Reduced off-road capability', 'Lower profile = less comfort', 'Check tire pressure requirements'],
      difficulty: 'easy'
    }
  ];
</script>

<div class="bg-bgCard rounded-xl p-6 border border-white/5 shadow-lg" id="upgrade-guidance">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-semibold text-textMain">Upgrade Guidance</h2>
    <span class="text-xs text-textMuted">Based on 2024-2026 EV scooter research</span>
  </div>

  <div class="space-y-4">
    {#each guidanceItems as item}
      <div class="bg-bgInput/40 rounded-lg p-4 border border-white/5">
        <div class="flex items-start gap-3">
          <span class="text-2xl">{item.icon}</span>
          <div class="flex-1">
            <h3 class="font-semibold text-textMain mb-1">{item.title}</h3>
            <p class="text-sm text-textMuted mb-3">{item.description}</p>

            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <div class="text-xs font-semibold text-success mb-2 uppercase tracking-wider">Benefits</div>
                <ul class="text-sm text-textMuted space-y-1">
                  {#each item.benefits as benefit}
                    <li class="flex items-start gap-2">
                      <span class="text-success mt-0.5">•</span>
                      <span>{benefit}</span>
                    </li>
                  {/each}
                </ul>
              </div>

              <div>
                <div class="text-xs font-semibold text-warning mb-2 uppercase tracking-wider">Considerations</div>
                <ul class="text-sm text-textMuted space-y-1">
                  {#each item.considerations as consideration}
                    <li class="flex items-start gap-2">
                      <span class="text-warning mt-0.5">•</span>
                      <span>{consideration}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>

            <div class="mt-3 pt-3 border-t border-gray-700/60">
              <span class="text-xs text-textMuted">Difficulty: </span>
              <span class={`text-xs px-2 py-0.5 rounded ${
                item.difficulty === 'easy'
                  ? 'bg-success/20 text-success'
                  : item.difficulty === 'moderate'
                  ? 'bg-warning/20 text-warning'
                  : 'bg-danger/20 text-danger'
              }`}>
                {item.difficulty}
              </span>
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-6 pt-4 border-t border-gray-700/60">
    <div class="bg-black/20 rounded-lg p-4 text-sm text-textMuted">
      <div class="font-semibold text-textMain mb-2">Safety Notes</div>
      <ul class="space-y-1">
        <li>• Always disconnect battery before modifying electrical systems</li>
        <li>• Wear appropriate safety gear when testing upgrades</li>
        <li>• Consult manufacturer specifications before exceeding voltage ratings</li>
        <li>• Consider thermal limits of motors, controllers, and batteries</li>
        <li>• Professional installation recommended for complex upgrades</li>
      </ul>
    </div>
  </div>
</div>
