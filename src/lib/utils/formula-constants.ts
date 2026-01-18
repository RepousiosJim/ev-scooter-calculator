// Physics Constants for EV Scooter Calculator
export const PHYSICS = {
  // Physical Constants
  AIR_DENSITY: 1.225,        // kg/m³
  GRAVITY: 9.81,             // m/s²
  INCH_TO_METER: 0.0254,     // Conversion factor

  // Scooter-Specific Constants
  FRONTAL_AREA: 0.6,         // m² (estimated)
  NOMINAL_VOLTAGE: 52,       // V
  BASE_ACCEL_RATIO: 25,      // W/kg for 100% score

  // Drag Coefficients
  DRAG: {
    UPRIGHT: 0.6,      // Sitting
    LEANING: 0.4,      // Forward
    TUCKED: 0.5,       // Crouched
  },

  // Efficiency Factors
  EFFICIENCY: {
    DRIVETRAIN: 0.92,      // Belt drive
    CHAIN_DRIVE: 0.95,     // Chain drive
    DIRECT_DRIVE: 0.98,    // Hub motor
  },

  // Battery Factors
  BATTERY: {
    CELL_VOLTAGE: 3.7,         // Nominal Li-ion cell voltage
    CHARGING_EFFICIENCY: 0.85, // Charging efficiency
    DISCHARGE_EFFICIENCY: 0.95,// Discharge efficiency
    MIN_SOH: 0.5,              // Minimum state of health
    MAX_SOH: 1.0,              // Maximum state of health
  },

  // Temperature Factors
  TEMPERATURE: {
    FREEZING_TEMP: -20,     // °C
    COLD_TEMP: 0,           // °C
    MILD_TEMP: 10,          // °C
    OPTIMAL_TEMP: 20,       // °C
    HOT_TEMP: 30,           // °C
    FREEZING_FACTOR: 0.6,   // 60% efficiency
    COLD_FACTOR: 0.7,       // 85% efficiency
    OPTIMAL_FACTOR: 1.0     // 100% efficiency
  },

  // Regen Factors
  REGEN: {
    BASE_FACTOR: 0.2,   // Conservative regen recovery
    MAX_FACTOR: 0.3     // Aggressive regen recovery
  },

  // Charging Factors
  CHARGING: {
    EFFICIENCY: 0.85,   // Battery charging efficiency
    OVERHEAD: 1.2,      // 20% overhead for charger losses
  },

  // Weight Factors
  WEIGHT: {
    KG_PER_WH: 0.06,    // Estimated scooter kg per Wh
    MIN_SCOOTER: 15,    // kg (base weight)
    RIDER_MIN: 50,      // kg
    RIDER_MAX: 150,     // kg
  }
};
