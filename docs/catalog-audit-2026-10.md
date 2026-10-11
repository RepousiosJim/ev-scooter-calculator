# Scooter catalog audit (October 2026)

All 204 presets were checked against manufacturer pages, retailers and reviewers (ERideHero, Rider Guide, Electric Scooter Guide and others). Each changed preset's `sourceUrl` points to the source that was used. Corrections from low-confidence findings were not applied.

## Removed: no evidence the model exists (404)

| Key                                                                           | Finding                                               |
| ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| `vsett_7_plus`                                                                | No VSETT 7/7+ exists                                  |
| `turboant_thunder_t1`                                                         | An e-bike, not a scooter                              |
| `niu_rqi_c`                                                                   | The NIU RQi is an electric motorcycle                 |
| `inokim_mini_5`                                                               | Only an Inokim Mini 2 exists                          |
| `pure_electric_s1_pro`                                                        | "S1 Pro" is an Ola Electric moped                     |
| `hiboy_ve2_pro`, `evercross_a6`                                               | No trace of either model                              |
| `spin_s100`                                                                   | Shared-fleet vehicle, never sold at retail            |
| `yume_d5`, `yume_y11`, `yume_m11`, `joyor_a5s`, `pure_electric_advance_rider` | Only classified ads or forum posts; no official specs |

## Merged or renamed (old links redirect)

Listed in `src/lib/data/preset-aliases.ts`.

- **Duplicates merged into one entry:**
  - Dualtron Compact
  - Levy Plus
  - Xiaomi Mi Pro 2
  - Segway Ninebot Max G2
  - Varla Falcon
  - Teverun Fighter Supreme 7260R
  - InMotion RS (the RS Midnight is the same scooter)
  - NIU KQi3 Sport
  - Kaabo Mantis 10 Lite
  - fluid Mosquito (no "Mosquito Pro" exists)
  - VSETT 11+ Super 72V (no 72V VSETT 10+ exists)
  - VSETT 10+ (no single-motor VSETT 10 exists)
- **Filed under the wrong model:**

  | Was                          | Now                           |
  | ---------------------------- | ----------------------------- |
  | Apollo City 5                | Apollo City 2.0               |
  | VSETT 8+ APEX                | VSETT 8+                      |
  | Mantis "2025 Fluid Edition"  | Kaabo Mantis V2 Fluid Edition |
  | GMAX GT4                     | isinwheel GT4 Dual            |
  | TurboAnt S Nova / S Nova Pro | isinwheel S Nova / S Nova Pro |
  | Segway Ninebot F3 Plus       | Segway Ninebot F3             |
  | EMOVE Touring XL             | EMOVE Touring                 |
  | EMOVE Cruiser Max            | EMOVE Cruiser V2              |
  | Dualtron Punk Rider          | Punk Rider Pro                |

## Spec corrections

About 150 presets had at least one field corrected (voltage, capacity, motor count, power, top speed, range, price or year).

`watts` now consistently holds **peak power per motor**. Many entries held the rated figure instead, and some Dualtron entries held the total peak.

Motor KV is now fitted to each scooter's claimed top speed by `scripts/calibrate-presets.mjs`. About 55 scooters can't reach their claim with the listed power; the script lists them. Range is calibrated as before, except that the Kaabo Wolf King GTR uses an independent range test (73 km) instead of the 180 km claim.

## Added (2025–2026)

- Apollo Dash
- Apollo Go Stellar
- Apollo City Stellar
- Apollo Explore 2.0
- Apollo Phantom 2.0
- Apollo Phantom 2.0 Stellar
- Segway Ninebot MAX G3 Plus
- NAVEE NT5 Ultra X
- NAVEE UT5 Ultra X
- Kaabo Wolf King GTR Max
- Xiaomi Electric Scooter 5 Pro

## Not yet done

- **Not added:** models with incomplete published specs:
  - Segway MAX G3 Pro and ZT3 MAX (EU, announced Oct 2026)
  - Segway F3 Pro
  - Xiaomi 5 Max
  - NAMI Burn-E 3 Max
  - VMAX VX2 Lite and VX6
  - EMOVE RoadRunner V3
  - InMotion RS PRO
  - Apollo Explore 2.0 Stellar
- **Not searched for new models:** Unagi, Pure Electric, Inokim, Splach, Kukirin, iScooter, Okai, Bird, VSETT, Hiboy and Gotrax. The research ran out of web searches before reaching them.
- **Left unchanged:** low-confidence rows, where sources conflict or no official page was found: `nami_burn_e_2_max`, `vsett_8`, `fluid_cityrider`, `wolf_warrior_x_plus`, `apollo_phantom_v3`, `vsett_11_plus`, `apollo_light`, `joyor_y5s`, `nanrobot_c1_3_0`. `gotrax_g3` and `nanrobot_m5` are marked `unverified`.
