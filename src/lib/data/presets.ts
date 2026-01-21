import type { ScooterConfig, ScooterPreset, PresetMetadata } from '$lib/types';

export const customPreset: ScooterConfig = {
  v: 52,
  ah: 16,
  motors: 2,
  watts: 1000,
  style: 30,
  weight: 80, // Default rider weight
  wheel: 10,
  motorKv: 60,
  scooterWeight: undefined,
  drivetrainEfficiency: 0.9,
  batterySagPercent: 0.08,
  charger: 3,
  regen: 0.05,
  cost: 0.20,
  slope: 0,
  ridePosition: 0.6,
  dragCoefficient: 0.7,
  frontalArea: 0.5,
  rollingResistance: 0.015,
  soh: 1,
  ambientTemp: 20
};

export const presets: ScooterPreset = {
  custom: customPreset,

  // --- 2024/2025 Models ---
  emove_roadster: {
    v: 84, ah: 40, motors: 2, watts: 3000, style: 50, weight: 80, wheel: 11, motorKv: 85, scooterWeight: 65,
    drivetrainEfficiency: 0.92, batterySagPercent: 0.05, charger: 5, regen: 0.15, cost: 0.20, slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20
  },
  inmotion_rs: {
    v: 72, ah: 40, motors: 2, watts: 2000, style: 45, weight: 80, wheel: 11, motorKv: 75, scooterWeight: 58,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.06, charger: 5, regen: 0.12, cost: 0.20, slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20
  },
  wolf_king_gtr: {
    v: 72, ah: 35, motors: 2, watts: 2000, style: 45, weight: 80, wheel: 12, motorKv: 78, scooterWeight: 63,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.07, charger: 5, regen: 0.1, cost: 0.20, slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20
  },
  teverun_fighter_supreme: {
    v: 72, ah: 60, motors: 2, watts: 2500, style: 48, weight: 80, wheel: 11, motorKv: 80, scooterWeight: 45,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.06, charger: 5, regen: 0.12, cost: 0.20, slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20
  },
  nami_klima: {
    v: 60, ah: 25, motors: 2, watts: 1000, style: 35, weight: 80, wheel: 10, motorKv: 62, scooterWeight: 36,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08, charger: 3, regen: 0.1, cost: 0.20, slope: 0, ridePosition: 0.55, soh: 1, ambientTemp: 20
  },
  apollo_city_2024_pro: {
    v: 48, ah: 20, motors: 2, watts: 500, style: 32, weight: 80, wheel: 10, motorKv: 65, scooterWeight: 30,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08, charger: 3, regen: 0.15, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  apollo_go: {
    v: 36, ah: 15, motors: 2, watts: 350, style: 28, weight: 80, wheel: 9, motorKv: 60, scooterWeight: 21,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.09, charger: 2, regen: 0.1, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  niu_kqi_air: {
    v: 48, ah: 9.4, motors: 1, watts: 350, style: 25, weight: 80, wheel: 9.5, motorKv: 50, scooterWeight: 12,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08, charger: 2, regen: 0.05, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  navee_gt3: {
    v: 48, ah: 12, motors: 1, watts: 400, style: 26, weight: 80, wheel: 10, motorKv: 55, scooterWeight: 22,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.08, charger: 2, regen: 0.05, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  segway_e2_pro: {
    v: 36, ah: 7.6, motors: 1, watts: 300, style: 22, weight: 80, wheel: 10, motorKv: 45, scooterWeight: 18,
    drivetrainEfficiency: 0.85, batterySagPercent: 0.1, charger: 2, regen: 0.05, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  xiaomi_4_lite_2: {
    v: 36, ah: 7.6, motors: 1, watts: 300, style: 20, weight: 80, wheel: 10, motorKv: 45, scooterWeight: 16,
    drivetrainEfficiency: 0.85, batterySagPercent: 0.1, charger: 1.5, regen: 0.05, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },

  // --- 2023 Models ---
  nami_burn_e_2_max: {
    v: 72, ah: 32, motors: 2, watts: 1500, style: 42, weight: 80, wheel: 11, motorKv: 75, scooterWeight: 47,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.07, charger: 5, regen: 0.1, cost: 0.20, slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20
  },
  segway_gt2: {
    v: 52, ah: 30, motors: 2, watts: 1500, style: 40, weight: 80, wheel: 11, motorKv: 70, scooterWeight: 52,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08, charger: 5, regen: 0.1, cost: 0.20, slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20
  },
  segway_gt1: {
    v: 60, ah: 16.8, motors: 1, watts: 1500, style: 38, weight: 80, wheel: 11, motorKv: 65, scooterWeight: 48,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08, charger: 3, regen: 0.1, cost: 0.20, slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20
  },
  kaabo_mantis_king_gt: {
    v: 60, ah: 24, motors: 2, watts: 1100, style: 36, weight: 80, wheel: 10, motorKv: 68, scooterWeight: 34,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08, charger: 3, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.55, soh: 1, ambientTemp: 20
  },
  mukuta_10_plus: {
    v: 60, ah: 20.8, motors: 2, watts: 1400, style: 37, weight: 80, wheel: 10, motorKv: 70, scooterWeight: 36,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08, charger: 3, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.55, soh: 1, ambientTemp: 20
  },
  roadrunner_rs5_plus: {
    v: 52, ah: 23.4, motors: 2, watts: 1300, style: 35, weight: 80, wheel: 10, motorKv: 68, scooterWeight: 39,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08, charger: 3, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.55, soh: 1, ambientTemp: 20
  },
  segway_max_g2: {
    v: 36, ah: 15.3, motors: 1, watts: 450, style: 26, weight: 80, wheel: 10, motorKv: 55, scooterWeight: 24.3,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.08, charger: 3, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  niu_kqi3_max: {
    v: 48, ah: 12.6, motors: 1, watts: 450, style: 28, weight: 80, wheel: 9.5, motorKv: 58, scooterWeight: 21,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.08, charger: 2.5, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  gotrax_g4: {
    v: 36, ah: 10.4, motors: 1, watts: 350, style: 24, weight: 80, wheel: 10, motorKv: 50, scooterWeight: 16.3,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.09, charger: 2, regen: 0.05, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  emove_cruiser_s: {
    v: 52, ah: 30, motors: 1, watts: 1000, style: 32, weight: 80, wheel: 10, motorKv: 60, scooterWeight: 23,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08, charger: 3, regen: 0.05, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  xiaomi_4_ultra: {
    v: 48, ah: 12, motors: 1, watts: 500, style: 28, weight: 80, wheel: 10, motorKv: 55, scooterWeight: 25,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.08, charger: 2.5, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },

  // --- 2022 & Classics ---
  vsett_10_plus: {
    v: 60, ah: 25.6, motors: 2, watts: 1400, style: 40, weight: 80, wheel: 10, motorKv: 75, scooterWeight: 36,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.07, charger: 3, regen: 0.1, cost: 0.20, slope: 0, ridePosition: 0.55, soh: 1, ambientTemp: 20
  },
  vsett_9_plus: {
    v: 48, ah: 19.2, motors: 2, watts: 650, style: 30, weight: 80, wheel: 8.5, motorKv: 60, scooterWeight: 25,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.08, charger: 3, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  vsett_8: {
    v: 48, ah: 15.6, motors: 1, watts: 600, style: 28, weight: 80, wheel: 8.5, motorKv: 55, scooterWeight: 21,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.08, charger: 2, regen: 0.05, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  turboant_x7_max: {
    v: 36, ah: 10, motors: 1, watts: 350, style: 24, weight: 80, wheel: 10, motorKv: 50, scooterWeight: 15.4,
    drivetrainEfficiency: 0.85, batterySagPercent: 0.1, charger: 2, regen: 0.05, cost: 0.20, slope: 0, ridePosition: 0.65, soh: 1, ambientTemp: 20
  },
  hiboy_s2_pro: {
    v: 36, ah: 11.6, motors: 1, watts: 350, style: 24, weight: 80, wheel: 10, motorKv: 48, scooterWeight: 16,
    drivetrainEfficiency: 0.85, batterySagPercent: 0.09, charger: 2, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  niu_kqi2_pro: {
    v: 48, ah: 7.8, motors: 1, watts: 300, style: 23, weight: 80, wheel: 10, motorKv: 45, scooterWeight: 18.4,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.08, charger: 2, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  unagi_voyager: {
    v: 36, ah: 10, motors: 2, watts: 250, style: 22, weight: 80, wheel: 7.5, motorKv: 50, scooterWeight: 13.4,
    drivetrainEfficiency: 0.85, batterySagPercent: 0.1, charger: 2, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  uscooters_gt_sport: {
    v: 48, ah: 10.5, motors: 1, watts: 700, style: 28, weight: 80, wheel: 8, motorKv: 65, scooterWeight: 13,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.09, charger: 2, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  inokim_light_2: {
    v: 36, ah: 10.4, motors: 1, watts: 350, style: 24, weight: 80, wheel: 8.5, motorKv: 50, scooterWeight: 13.7,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.09, charger: 2, regen: 0.05, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  },
  dualtron_thunder_3: {
    v: 72, ah: 40, motors: 2, watts: 2000, style: 45, weight: 80, wheel: 11, motorKv: 80, scooterWeight: 47,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.07, charger: 5, regen: 0.1, cost: 0.20, slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20
  },
  m365_pro_2: {
    v: 36, ah: 12.8, motors: 1, watts: 300, style: 22, weight: 80, wheel: 8.5, motorKv: 45, scooterWeight: 14.2,
    drivetrainEfficiency: 0.88, batterySagPercent: 0.09, charger: 2, regen: 0.08, cost: 0.20, slope: 0, ridePosition: 0.6, soh: 1, ambientTemp: 20
  }
};

export const defaultConfig: ScooterConfig = {
  ...customPreset,
  controller: undefined,
  rpm: undefined
};

export const presetMetadata: Record<string, PresetMetadata> = {
  // --- 2024/2025 Models ---
  emove_roadster: { name: "EMOVE Roadster", year: 2025, manufacturer: { topSpeed: 112, range: 110, batteryWh: 3360, powerToWeight: 92, price: 5995 } },
  inmotion_rs: { name: "InMotion RS", year: 2024, manufacturer: { topSpeed: 110, range: 120, batteryWh: 2880, powerToWeight: 68, price: 3999 } },
  wolf_king_gtr: { name: "Kaabo Wolf King GTR", year: 2024, manufacturer: { topSpeed: 105, range: 140, batteryWh: 2520, powerToWeight: 63, price: 3995 } },
  teverun_fighter_supreme: { name: "Teverun Fighter Supreme", year: 2024, manufacturer: { topSpeed: 110, range: 120, batteryWh: 4320, powerToWeight: 110, price: 4299 } },
  nami_klima: { name: "NAMI Klima", year: 2024, manufacturer: { topSpeed: 67, range: 80, batteryWh: 1500, powerToWeight: 55, price: 2199 } },
  apollo_city_2024_pro: { name: "Apollo City Pro (2024)", year: 2024, manufacturer: { topSpeed: 51, range: 69, batteryWh: 960, powerToWeight: 33, price: 1699 } },
  apollo_go: { name: "Apollo Go", year: 2024, manufacturer: { topSpeed: 45, range: 48, batteryWh: 540, powerToWeight: 33, price: 1199 } },
  niu_kqi_air: { name: "NIU KQi Air", year: 2024, manufacturer: { topSpeed: 32, range: 50, batteryWh: 451, powerToWeight: 29, price: 1049 } },
  navee_gt3: { name: "Navee GT3", year: 2024, manufacturer: { topSpeed: 32, range: 30, batteryWh: 576, price: 499 } },
  segway_e2_pro: { name: "Segway E2 Pro", year: 2024, manufacturer: { topSpeed: 25, range: 27, batteryWh: 275, price: 399 } },
  xiaomi_4_lite_2: { name: "Xiaomi 4 Lite 2nd Gen", year: 2024, manufacturer: { topSpeed: 25, range: 25, batteryWh: 275, price: 299 } },

  // --- 2023 Models ---
  nami_burn_e_2_max: { name: "NAMI Burn-E 2 Max", year: 2023, manufacturer: { topSpeed: 96, range: 140, batteryWh: 2304, powerToWeight: 64, price: 3499 } },
  segway_gt2: { name: "Segway SuperScooter GT2", year: 2023, manufacturer: { topSpeed: 70, range: 90, batteryWh: 1512, powerToWeight: 57, price: 3999 } },
  segway_gt1: { name: "Segway SuperScooter GT1", year: 2023, manufacturer: { topSpeed: 60, range: 70, batteryWh: 1008, powerToWeight: 62, price: 1999 } },
  kaabo_mantis_king_gt: { name: "Kaabo Mantis King GT", year: 2023, manufacturer: { topSpeed: 70, range: 80, batteryWh: 1440, powerToWeight: 64, price: 2195 } },
  mukuta_10_plus: { name: "Mukuta 10 Plus", year: 2023, manufacturer: { topSpeed: 74, range: 100, batteryWh: 1248, powerToWeight: 77, price: 1999 } },
  roadrunner_rs5_plus: { name: "RoadRunner RS5+", year: 2023, manufacturer: { topSpeed: 72, range: 80, batteryWh: 1216, powerToWeight: 66, price: 2090 } },
  segway_max_g2: { name: "Ninebot Max G2", year: 2023, manufacturer: { topSpeed: 35, range: 70, batteryWh: 551, powerToWeight: 18, price: 899 } },
  niu_kqi3_max: { name: "NIU KQi3 Max", year: 2023, manufacturer: { topSpeed: 38, range: 65, batteryWh: 608, powerToWeight: 21, price: 899 } },
  gotrax_g4: { name: "Gotrax G4", year: 2023, manufacturer: { topSpeed: 32, range: 40, batteryWh: 374, powerToWeight: 21, price: 499 } },
  emove_cruiser_s: { name: "EMOVE Cruiser S", year: 2023, manufacturer: { topSpeed: 53, range: 100, batteryWh: 1560, powerToWeight: 43, price: 1399 } },
  xiaomi_4_ultra: { name: "Xiaomi 4 Ultra", year: 2023, manufacturer: { topSpeed: 25, range: 70, batteryWh: 561, powerToWeight: 20, price: 999 } },

  // --- 2022 & Classics ---
  vsett_10_plus: { name: "VSETT 10+", year: 2022, manufacturer: { topSpeed: 80, range: 100, batteryWh: 1536, powerToWeight: 77, price: 1799 } },
  vsett_9_plus: { name: "VSETT 9+", year: 2022, manufacturer: { topSpeed: 53, range: 70, batteryWh: 921, powerToWeight: 52, price: 1290 } },
  vsett_8: { name: "VSETT 8", year: 2022, manufacturer: { topSpeed: 42, range: 50, batteryWh: 748, powerToWeight: 28, price: 899 } },
  turboant_x7_max: { name: "Turboant X7 Max", year: 2022, manufacturer: { topSpeed: 32, range: 51, batteryWh: 360, price: 449 } },
  hiboy_s2_pro: { name: "Hiboy S2 Pro", year: 2022, manufacturer: { topSpeed: 30, range: 40, batteryWh: 417, price: 399 } },
  niu_kqi2_pro: { name: "NIU KQi2 Pro", year: 2022, manufacturer: { topSpeed: 28, range: 40, batteryWh: 374, price: 419 } },
  unagi_voyager: { name: "Unagi Model One Voyager", year: 2022, manufacturer: { topSpeed: 25, range: 25, batteryWh: 360, price: 1190 } },
  uscooters_gt_sport: { name: "Uscooters GT Sport", year: 2022, manufacturer: { topSpeed: 48, range: 35, batteryWh: 504, powerToWeight: 53, price: 1099 } },
  inokim_light_2: { name: "Inokim Light 2", year: 2022, manufacturer: { topSpeed: 34, range: 35, batteryWh: 374, price: 799 } },
  dualtron_thunder_3: { name: "Dualtron Thunder 3", year: 2022, manufacturer: { topSpeed: 100, range: 125, batteryWh: 2880, powerToWeight: 85, price: 4499 } },
  m365_pro_2: { name: "Xiaomi M365 Pro 2", year: 2021, manufacturer: { topSpeed: 25, range: 45, batteryWh: 460, price: 500 } }
};
