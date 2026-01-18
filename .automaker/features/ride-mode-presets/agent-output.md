1. **Problem**: Users want quick access to ride mode presets (eco/normal/sport/turbo) that adjust power output and efficiency settings without manually configuring individual parameters.

2. **Solution**: Add ride mode presets that modify scooter configuration parameters (riding style, power output) with a UI component for mode selection and display of efficiency tradeoffs.

3. **Acceptance Criteria**:
   - GIVEN a scooter configuration, WHEN a user selects a ride mode (eco/normal/sport/turbo), THEN the system applies preset values for power and efficiency settings
   - GIVEN a selected ride mode, WHEN viewing the mode info, THEN the system displays range impact and efficiency tradeoffs
   - GIVEN multiple ride modes, WHEN switching between them, THEN the performance stats update accordingly

4. **Files to Modify**:
   | File | Purpose | Action |
   |------|---------|--------|
   | src/lib/types.ts | Add ride mode types | modify |
   | src/lib/data/rideModes.ts | Define ride mode presets | create |
   | src/lib/stores/calculator.svelte.ts | Add ride mode state and actions | modify |
   | src/lib/components/calculator/RideModeSelector.svelte | Create mode selector UI | create |
   | src/routes/+page.svelte | Add ride mode selector to UI | modify |
   | src/lib/utils/physics.ts | Add ride mode impact calculation | modify |

5. **Implementation Tasks**:
   ```tasks
   - [ ] T001: Add RideMode and RideModePreset types | File: src/lib/types.ts
   - [ ] T002: Create ride mode presets data file with eco/normal/sport/turbo configurations | File: src/lib/data/rideModes.ts
   - [ ] T003: Add rideMode state to calculatorState and create applyRideMode function | File: src/lib/stores/calculator.svelte.ts
   - [ ] T004: Create RideModeSelector component with mode buttons and impact display | File: src/lib/components/calculator/RideModeSelector.svelte
   - [ ] T005: Add calculateRideModeImpact function in physics.ts | File: src/lib/utils/physics.ts
   - [ ] T006: Add RideModeSelector to the configuration page | File: src/routes/+page.svelte
   ```

6. **Verification**: Use Playwright to verify that:
   - Ride mode buttons are displayed and clickable
   - Selecting a mode updates performance stats
   - Mode information shows range impact correctly

[SPEC_GENERATED] Please review the specification above. Reply with 'approved' to proceed or provide feedback for revisions.