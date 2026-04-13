export interface GuideSection {
	id: string;
	heading: string;
	content: string;
}

export interface Guide {
	slug: string;
	title: string;
	description: string;
	category: 'buying' | 'technical' | 'maintenance';
	publishedDate: string;
	updatedDate: string;
	readingTime: number;
	sections: GuideSection[];
}

export const guides: Guide[] = [
	{
		slug: 'best-scooters-for-commuting',
		title: 'Best Electric Scooters for Commuting in 2025',
		description:
			'Find the right electric scooter for your daily commute. We cover range, portability, weather, safety, and top picks across every budget.',
		category: 'buying',
		publishedDate: '2025-01-15',
		updatedDate: '2025-04-01',
		readingTime: 9,
		sections: [
			{
				id: 'what-to-look-for',
				heading: 'What to Look For in a Commuter Scooter',
				content: `<p>Not every electric scooter is built for the daily grind. A commuter scooter needs to balance range, portability, durability, and cost in a way that a weekend-ride scooter simply doesn't. The spec sheet that impresses at a dealership can be deceiving once you factor in real-world range loss, luggage carrying, hills, and the unglamorous reality of hauling the thing up a flight of stairs to your office.</p>
<p>The most important commuter traits are: enough range to cover your round trip with 20% reserve, a weight you can actually carry when needed, IP-rated weather protection, and a battery warranty that covers at least two years. Anything beyond that — suspension quality, braking system, display — matters, but comes secondary to these core four.</p>
<p>Use our <a href="/" class="text-primary hover:text-primary-hover underline underline-offset-2">performance calculator</a> to enter your commute distance and terrain and see exactly which specs you need before you start shopping.</p>`,
			},
			{
				id: 'range-requirements',
				heading: 'Calculating Your Real-World Range Requirements',
				content: `<p>Manufacturers publish range figures measured under ideal conditions: flat road, 70 kg rider, 25 km/h constant speed, room temperature. In real commuting conditions — hills, stop-and-go traffic, cold mornings, a rider over 80 kg — you'll typically see 60–75% of that advertised figure.</p>
<p>The golden rule: take the manufacturer's stated range and multiply by 0.65 to get your conservative real-world estimate. If your round trip is 20 km, you need a scooter rated for at least 31 km (20 ÷ 0.65). Add another 20% buffer if your route has significant hills or if you're in a climate that regularly dips below 10 °C.</p>
<ul>
  <li><strong>Short commutes (under 10 km round trip):</strong> Any scooter rated 20+ km will comfortably cover your day.</li>
  <li><strong>Medium commutes (10–25 km):</strong> Look for 40–60 km rated range. This is the sweet spot for most urban riders.</li>
  <li><strong>Long commutes (25–40 km):</strong> You need 60–80 km rated range or a scooter with a swappable battery.</li>
  <li><strong>Extreme commutes (40 km+):</strong> Consider dual-battery models or plan for a mid-day charge at the office.</li>
</ul>`,
			},
			{
				id: 'portability',
				heading: 'Portability: Weight, Folding, and Storage',
				content: `<p>If you combine your scooter with public transit — boarding a train, carrying it up subway stairs — weight is non-negotiable. Anything over 15 kg becomes genuinely exhausting to carry for more than a minute. The best commuter scooters in the 12–15 kg range hit a sweet spot: light enough to lift, heavy enough to feel stable at speed.</p>
<p>Fold time and fold quality matter just as much as raw weight. A scooter that folds in two seconds with a reliable latch is far more practical than one that saves 2 kg but requires two hands and a prayer to collapse. Look for a stem latch that can't accidentally unfold while you're carrying it.</p>
<p>Also consider your storage situation at both ends of your commute. Does it fit under your desk? In a train luggage rack? In the boot of a car if it rains? Measure before you buy — many commuters are surprised to find their scooter doesn't fit in the spaces they assumed it would.</p>`,
			},
			{
				id: 'weather-considerations',
				heading: 'Weather Proofing: Riding Through Rain and Cold',
				content: `<p>Water is a scooter's worst enemy. Every electronic component — battery, motor, controller, display — is potentially at risk from moisture intrusion. Look for a minimum IP54 rating for the scooter body, which means protection against splashing water from any direction. The better commuter scooters reach IP55 or IP56, which handles riding in rain without issue.</p>
<p>Cold weather is a separate problem from wetness. Lithium-ion batteries lose 15–30% of their effective capacity below 5 °C and can be permanently damaged if charged while frozen. In winter, store your scooter indoors, let it warm to room temperature before charging, and expect your real-world range to be at the lower end of your calculations.</p>
<p>Tyre choice also matters in wet conditions. Solid tyres are puncture-proof but have significantly less grip on wet surfaces. Air-filled (pneumatic) tyres grip better in the wet but risk punctures. For year-round commuting in a rainy climate, pneumatic tyres with a decent tread pattern are the safer choice.</p>`,
			},
			{
				id: 'top-picks-by-budget',
				heading: 'Top Picks by Budget',
				content: `<p>The electric scooter market has matured significantly, and there are now genuinely good options at every price point. Here's an honest breakdown by budget category:</p>
<ul>
  <li><strong>Under $400 (Entry Level):</strong> Xiaomi Essential series and similar. Expect 20–25 km real-world range, 12–13 kg weight, basic IP54 protection. Fine for short, flat commutes in dry weather. Weak brakes on hills.</li>
  <li><strong>$400–$800 (Mid Range):</strong> Xiaomi Pro 2, Segway Ninebot Max G2, Hiboy S2 Pro. Substantially better range (30–40 km real-world), improved build quality, better displays. The sweet spot for most commuters.</li>
  <li><strong>$800–$1,500 (Performance):</strong> Unagi Model One Voyager, Apollo Air. Lightweight premium builds, longer warranty, better suspension. Justifiable for daily commutes over 20 km or demanding terrain.</li>
  <li><strong>$1,500+ (Premium/Long Range):</strong> Kaabo Wolf Warrior lite-class, Apollo Ghost. Dual motors, 50+ km real-world range, top-tier braking. Only necessary for very long commutes or if you want significant reserve range for peace of mind.</li>
</ul>
<p>Check our <a href="/rankings" class="text-primary hover:text-primary-hover underline underline-offset-2">scooter rankings page</a> to see how models compare on our performance scoring system before making a final decision.</p>`,
			},
			{
				id: 'safety-gear',
				heading: 'Safety Gear: What You Actually Need',
				content: `<p>A helmet is non-negotiable. In most jurisdictions it's also the law. For commuting speeds (up to 25 km/h), a quality urban cycling helmet provides sufficient protection; for scooters capable of 35–45 km/h, consider a certified e-scooter or motorcycle half-shell helmet. Don't spend $800 on a scooter and $20 on a helmet — that's backwards thinking.</p>
<p>Beyond helmets, gloves are the most underrated safety item. In any fall your hands instinctively reach out to break the impact; without gloves, road rash on your palms is almost guaranteed. Padded cycling gloves are a reasonable minimum; wrist guards add significant protection for minimal cost.</p>
<p>High-visibility gear matters for commuting, especially in winter when you're riding in low-light conditions. A reflective vest or jacket, plus the scooter's built-in lights, dramatically reduces your risk of being struck by a vehicle. Many commuters are injured not because they fell but because they weren't seen.</p>`,
			},
		],
	},
	{
		slug: 'how-to-read-scooter-specs',
		title: 'How to Read Electric Scooter Specs: A Complete Guide',
		description:
			'Decode electric scooter spec sheets. Learn what voltage, motor power, range claims, wheel size, and braking specs actually mean for real-world riding.',
		category: 'technical',
		publishedDate: '2025-02-03',
		updatedDate: '2025-04-01',
		readingTime: 10,
		sections: [
			{
				id: 'voltage-and-battery',
				heading: 'Voltage & Battery Capacity: The Foundation',
				content: `<p>The battery is the most important — and most expensive — component in any electric scooter. Understanding battery specs helps you compare models meaningfully rather than being misled by marketing language. The two core numbers are <strong>voltage (V)</strong> and <strong>amp-hour capacity (Ah)</strong>. Multiply them together to get watt-hours (Wh), which is the true measure of stored energy.</p>
<p>A 36V 10Ah battery stores 360 Wh. A 48V 15Ah battery stores 720 Wh — roughly twice the energy. Comparing Ah figures across scooters with different voltages is meaningless; always compare Wh. A higher Wh figure means more range, more power headroom, and usually a heavier, more expensive scooter.</p>
<p>Battery chemistry also matters. Most modern scooters use 18650-format lithium-ion cells (the same type in laptops). Premium scooters use cells from Samsung, LG, or Panasonic, which have better energy density and longer cycle life than the generic cells found in budget models. Cell quality is rarely disclosed in spec sheets, but it's often the biggest differentiator between a $300 scooter and an $800 one with similar headline specs.</p>`,
			},
			{
				id: 'motor-power',
				heading: 'Motor Power: Watts, Peak vs Rated, Hub vs Geared',
				content: `<p>Motor power is one of the most misleading specs in the industry. Manufacturers almost universally advertise peak power — the maximum the motor can produce for a few seconds — rather than rated (continuous) power, which is what it sustains on a long hill. A scooter advertised as "500W" might only sustain 250W continuously.</p>
<p>For practical purposes, divide advertised peak watts by 2 to get a conservative estimate of sustained power. For flat urban commuting, 250W sustained is plenty. Hills over 10% gradient start to challenge motors below 350W sustained. Dual-motor scooters (two 500W motors) genuinely deliver impressive hill climbing and acceleration because both motors share the load.</p>
<ul>
  <li><strong>Hub motors</strong> (wheel-mounted): Simpler, lower maintenance, quieter. The most common type. Slightly less efficient than geared motors.</li>
  <li><strong>Geared hub motors</strong>: More efficient, better low-speed torque, but more moving parts to maintain. Found in higher-end commuter scooters.</li>
  <li><strong>Direct drive motors</strong>: Maximum power output, regenerative braking, zero maintenance. Heavy. Found in performance scooters.</li>
</ul>
<p>Enter motor specs into our <a href="/" class="text-primary hover:text-primary-hover underline underline-offset-2">performance calculator</a> to see how different motor configurations affect acceleration and hill-climbing ability on your specific terrain.</p>`,
			},
			{
				id: 'range-claims-vs-reality',
				heading: 'Range Claims vs Reality: The 65% Rule',
				content: `<p>No subject in electric scooter reviews generates more frustration than range. Manufacturers test under ideal conditions that bear little resemblance to daily riding: flat smooth roads, light rider, moderate constant speed, perfect temperature. The EU standard test (ECE R136) is somewhat more realistic, but still optimistic compared to mixed real-world use.</p>
<p>The 65% rule is a reliable rule of thumb: expect to get 65% of the advertised range in typical mixed-use commuting conditions. For a scooter rated 50 km, plan on 32–33 km in reality. If you're heavier than 75 kg, in cold weather, or on hilly terrain, apply a further 10–15% reduction.</p>
<p>The most honest spec to look for is Wh/km efficiency, which some manufacturers now include. A scooter consuming 15 Wh/km with a 360 Wh battery will genuinely cover 24 km — and that figure holds up better under real-world conditions than the headline range claim. Our calculator uses physics-based modelling to give you a realistic range estimate based on your weight, terrain, and riding style.</p>`,
			},
			{
				id: 'weight-matters',
				heading: 'Why Weight Matters More Than You Think',
				content: `<p>Scooter weight affects four things: portability, acceleration, braking distance, and range. Heavier scooters require more energy to accelerate (reducing range), take slightly longer to stop, and are harder to carry. The difference between a 12 kg scooter and a 20 kg scooter sounds modest on paper but is significant in daily use — particularly if you carry it up stairs or onto public transit regularly.</p>
<p>Total system weight (rider + scooter + cargo) is what the motor actually moves. A 500W motor pushing 100 kg (80 kg rider + 20 kg scooter) will perform noticeably worse on hills than the same motor pushing 82 kg (70 kg rider + 12 kg scooter). This is why lighter scooters often feel punchier than their motor specs would suggest — the power-to-weight ratio is better.</p>
<p>Most manufacturers list a maximum rider weight of 100–120 kg. This is usually a conservative figure for structural safety; the actual performance degradation happens well before that limit. A 90 kg rider on a scooter rated for 100 kg will experience noticeably reduced range and hill performance compared to what the spec sheet suggests.</p>`,
			},
			{
				id: 'wheel-size',
				heading: 'Wheel Size and Tyre Type: Comfort and Safety',
				content: `<p>Wheel diameter directly affects ride comfort and obstacle-clearing ability. Larger wheels roll over cracks, kerbs, and surface irregularities more smoothly. The most common sizes are 8", 10", and 12". An 8" wheel will feel every expansion joint in the road; a 10" wheel is noticeably smoother; 12" wheels deliver something approaching a comfortable ride.</p>
<p>Tyre type — solid (airless) versus pneumatic (air-filled) — is arguably more important than diameter. Solid tyres eliminate the risk of punctures but transmit significantly more vibration and offer less grip, especially on wet surfaces. Pneumatic tyres absorb road buzz effectively and grip far better in corners and wet conditions, but require occasional pressure checks and can puncture.</p>
<p>For commuting on maintained urban roads, 10" pneumatic tyres are the reliable all-rounder. If you ride in areas with frequent debris or rough surfaces, consider solid tyres for their zero-maintenance convenience, but accept the comfort trade-off. Never run pneumatic tyres underinflated — it increases rolling resistance and dramatically increases puncture risk.</p>`,
			},
			{
				id: 'suspension',
				heading: 'Suspension Systems: Spring, Rubber, and Hydraulic',
				content: `<p>Suspension is one of the most significant comfort and safety features that varies widely across price points. Budget scooters typically rely on tyre pressure alone (or solid tyres with no suspension whatsoever). Mid-range models add a front spring fork. Premium scooters feature dual suspension — front and rear — with hydraulic damping.</p>
<p>Front suspension matters most because the front wheel encounters obstacles first. A basic spring fork provides meaningful comfort improvement over no suspension. However, spring forks without damping can bounce unpredictably over repeated bumps, actually creating handling instability at higher speeds. Look for spring-plus-damper systems rather than spring-only.</p>
<p>Rear suspension is less common below $600 but makes a substantial difference on rough roads. If you regularly ride on unpaved paths, cobblestones, or poorly-maintained roads, dual suspension is worth the additional cost. It also reduces the fatigue transmitted to your wrists and lower back over longer rides.</p>`,
			},
			{
				id: 'braking',
				heading: 'Braking Systems: The Safety Spec No One Talks About Enough',
				content: `<p>Braking is the most safety-critical spec on any scooter, yet it receives far less attention than motor power or range in marketing materials. The three main brake types are: electronic brakes (motor regeneration), drum brakes, and disc brakes. Most scooters combine an electronic front brake with a mechanical rear brake.</p>
<p>Disc brakes are by far the most effective mechanical braking option, offering shorter stopping distances and more modulated control, especially in wet conditions. A front disc brake is significantly more important than a rear disc brake (the front handles 70% of braking force). If a scooter only has one disc brake, make sure it's on the front wheel.</p>
<p>Electronic regenerative brakes slow the scooter by turning the motor into a generator. They work well at moderate speeds but lose effectiveness below about 15 km/h and provide no stopping power in electrical failure. Never rely solely on electronic brakes — always confirm the scooter has at least one mechanical brake system rated for your maximum speed.</p>
<ul>
  <li><strong>Best:</strong> Dual hydraulic disc brakes</li>
  <li><strong>Good:</strong> Front hydraulic disc + rear drum or electronic</li>
  <li><strong>Adequate:</strong> Front mechanical disc + rear drum</li>
  <li><strong>Avoid for performance use:</strong> Drum-only or electronic-only braking</li>
</ul>`,
			},
		],
	},
	{
		slug: 'battery-care-guide',
		title: 'Electric Scooter Battery Care: Maximize Lifespan & Range',
		description:
			'Learn how to extend your electric scooter battery life. Charging best practices, storage tips, temperature effects, and signs of degradation explained.',
		category: 'maintenance',
		publishedDate: '2025-02-20',
		updatedDate: '2025-04-01',
		readingTime: 8,
		sections: [
			{
				id: 'how-lithium-batteries-work',
				heading: 'How Lithium-Ion Batteries Work',
				content: `<p>Understanding your battery's chemistry helps you make better decisions about charging and storage. Lithium-ion batteries store energy through the movement of lithium ions between a graphite anode and a metal-oxide cathode. Each charge/discharge cycle causes microscopic physical changes to these electrodes. Over hundreds or thousands of cycles, this accumulated stress reduces the battery's capacity to hold charge — this is called capacity fade.</p>
<p>The battery management system (BMS) is a circuit board that monitors cell voltages, temperature, and current flow to keep each cell within safe operating limits. A good BMS prevents overcharging (which damages the cathode), over-discharging (which damages the anode), and thermal runaway (which causes fires). When a battery "dies" suddenly, it's often the BMS shutting down to prevent damage rather than total energy exhaustion.</p>
<p>Importantly, not all of your battery's stated capacity is usable. Manufacturers program the BMS to leave a buffer at both the top and bottom — typically 5–10% at each end. A scooter showing "100%" on its display is actually at around 90% of the true cell capacity, and "0%" is at around 10%. This is intentional and healthy.</p>`,
			},
			{
				id: 'charging-best-practices',
				heading: 'Charging Best Practices: The 20–80% Rule',
				content: `<p>The most impactful thing you can do for battery longevity is avoid consistently charging to 100% and discharging to near 0%. Lithium-ion cells experience the most stress at the extremes of their charge range. The ideal storage and daily-use window is 20–80% of stated capacity. Keeping the battery in this range can more than double the number of healthy cycles you get before significant capacity degradation.</p>
<p>For daily commuting, this means charging to 80% on most days, and only topping to 100% when you genuinely need the full range. Many scooter apps and smart chargers allow you to set a charge limit; use it. If yours doesn't, unplug when the indicator shows roughly 80% and make a habit of it.</p>
<ul>
  <li>Never charge a battery that is still hot from use — let it cool to ambient temperature first (at least 15 minutes).</li>
  <li>Use the manufacturer-supplied charger or a quality replacement at the correct voltage. Under-voltage chargers charge slowly but are fine; over-voltage chargers can damage cells.</li>
  <li>Don't leave the scooter plugged in for days after reaching full charge. Continuous float charging at 100% accelerates degradation.</li>
  <li>Charge at room temperature (15–30 °C) whenever possible. Cold charging is especially damaging.</li>
</ul>`,
			},
			{
				id: 'storage-tips',
				heading: 'Long-Term Storage: Keeping Your Battery Healthy',
				content: `<p>If you're storing your scooter for more than a few weeks — over winter, for example — battery management becomes critical. Storing a lithium battery fully discharged causes lithium plating on the anode, permanently reducing capacity. Storing it at 100% causes sustained stress on the cathode. The sweet spot for long-term storage is 40–60% charge.</p>
<p>Check the battery charge every 4–6 weeks during storage and top it up to 50% if it has dropped below 30%. Completely ignoring a stored scooter for several months is the single most common cause of batteries that seem "dead" — they've discharged past the BMS cutoff and require a specialised reconditioning charge (if they can be recovered at all).</p>
<p>Store the scooter in a cool, dry location away from direct sunlight. Garages are acceptable in moderate climates, but avoid storage where temperatures will regularly drop below 0 °C or exceed 45 °C. A shelf in a heated hallway is ideal. Never store in a vehicle boot where summer temperatures can exceed 60 °C.</p>`,
			},
			{
				id: 'temperature-effects',
				heading: 'Temperature Effects on Performance and Safety',
				content: `<p>Temperature is the environmental factor with the greatest impact on both performance and longevity. Cold weather reduces electrolyte conductivity, slowing ion movement and reducing the battery's effective output power. Below 0 °C, a lithium-ion battery may only deliver 50–60% of its room-temperature capacity. Below -10 °C, many BMS units will simply refuse to allow discharge to prevent damage.</p>
<p>Charging in cold conditions is significantly more dangerous than discharging. Below 5 °C, lithium plating can occur during charging — metallic lithium deposits form on the anode rather than integrating properly. These deposits reduce capacity permanently and, in severe cases, create internal short circuits that are a fire risk. Always charge at above 5 °C, and let a cold scooter warm up indoors for 30 minutes before plugging in.</p>
<p>Heat is the other extreme. Extended exposure to temperatures above 40 °C — especially while charging or discharging under high load — accelerates electrolyte decomposition and separator degradation. If you ride in a hot climate, avoid leaving the scooter in direct sunlight after a ride, especially with a warm battery. Let it cool before charging.</p>`,
			},
			{
				id: 'when-to-replace',
				heading: 'When to Replace Your Battery',
				content: `<p>Most lithium-ion scooter batteries are rated for 500–800 full charge cycles before dropping below 80% of original capacity. In practice, if you follow good charging habits (the 20–80% rule), you can extend this to 800–1,200 cycles before meaningful degradation. For a daily commuter who charges once per day, that's 2–3 years of good range, followed by gradual decline rather than sudden failure.</p>
<p>The decision to replace comes down to whether the reduced range still meets your needs. A battery at 75% capacity isn't dangerous — it just means your effective range is reduced proportionally. If your commute once took 60% battery and now takes 80%, you're losing margin but still functional. When you can no longer complete your round trip reliably even at the top of a charge, replacement makes economic sense.</p>
<p>Replacement batteries are available for most popular scooter models, typically costing $150–$400 depending on capacity. Verify compatibility carefully — not just voltage, but connector type and BMS communication protocol. Incorrect batteries can damage the scooter's charging circuit or trip safety cutoffs. If in doubt, buy from the original manufacturer's parts program.</p>`,
			},
			{
				id: 'signs-of-degradation',
				heading: 'Signs of Battery Degradation and Failure',
				content: `<p>Capacity fade is normal and gradual. More concerning are signs of acute cell failure that warrant immediate attention. Know the difference:</p>
<ul>
  <li><strong>Normal degradation:</strong> Range decreases gradually over months. Battery percentage meter feels less accurate at extremes. Scooter feels slightly less powerful on steep hills.</li>
  <li><strong>Concerning signs:</strong> Range drops suddenly (more than 20%) between charges. Battery percentage jumps erratically rather than declining smoothly. Scooter shuts off unexpectedly under load even at partial charge.</li>
  <li><strong>Warning signs requiring immediate action:</strong> Battery swells visibly (pack feels puffy or deck becomes raised). Smell of burning or chemical odour from battery area. Battery becomes unusually hot to the touch while charging at low current. Charger indicator cycles on and off repeatedly without completing a charge.</li>
</ul>
<p>A swollen battery is a lithium-ion battery that has begun outgassing due to internal cell failure. Do not continue to use or charge it. Store it in a cool outdoor location away from flammable materials and contact the manufacturer about recycling. Never puncture, compress, or discard lithium batteries in general waste — they are a fire hazard and toxic waste.</p>`,
			},
		],
	},
	{
		slug: 'understanding-performance-scores',
		title: 'Understanding EV Scooter Performance Scores',
		description:
			'How our 100-point performance scoring system works. Learn how acceleration, range, speed, and efficiency scores are calculated and what the S–F grades mean.',
		category: 'technical',
		publishedDate: '2025-03-10',
		updatedDate: '2025-04-01',
		readingTime: 7,
		sections: [
			{
				id: 'how-scores-are-calculated',
				heading: 'How the 100-Point Score Is Built',
				content: `<p>Every scooter in our database receives a composite performance score out of 100 points. The score is not based on marketing claims or editorial opinion — it's derived from a physics-based simulation that models how each scooter would perform under standardised test conditions. The same simulation powers our <a href="/" class="text-primary hover:text-primary-hover underline underline-offset-2">real-time calculator</a>.</p>
<p>The score is divided into four performance categories, each weighted by its practical importance to the typical rider. Rather than treating all performance dimensions equally, the weighting reflects what actually matters day-to-day: range and acceleration have the most impact on usability, while top speed (which is legally capped in most jurisdictions) carries less weight. Efficiency, which governs your running costs, rounds out the picture.</p>
<p>Raw physics scores are calculated first, then adjusted for real-world penalties based on known limitations in the scooter's design. The result is a score that correlates strongly with user satisfaction ratings and reviewer benchmarks — and can be reproduced for custom configurations using our calculator.</p>`,
			},
			{
				id: 'acceleration-score',
				heading: 'Acceleration Score (30 Points)',
				content: `<p>Acceleration is the largest single component of the score because it most directly determines ride feel and urban usability. A scooter that surges confidently from 0–25 km/h in 3 seconds feels dramatically more capable than one that takes 6 seconds, even if their top speeds are identical. In urban traffic — getting away from lights, merging into lanes, avoiding pedestrians — acceleration is safety-relevant as much as fun.</p>
<p>The acceleration score is derived from our physics model's 0–25 km/h time estimate, which accounts for motor power, rider weight (standardised to 75 kg), drivetrain efficiency, and rolling resistance. The scoring curve is calibrated so that 30 points (maximum) corresponds to a class-leading 0–25 km/h time of approximately 2.5 seconds, while 0 points represents a sluggish 10+ second time.</p>
<p>A score of 25+ points indicates excellent acceleration suitable for aggressive urban riding. 15–24 points covers competent everyday performance. Below 15 points the scooter will feel underpowered in stop-and-go traffic, particularly when ridden by heavier users or on inclines. Use the calculator to see how changing motor watts affects your specific scooter's acceleration score.</p>`,
			},
			{
				id: 'range-score',
				heading: 'Range Score (25 Points)',
				content: `<p>Range earns 25 points because it determines the practical envelope of the scooter — where you can go and what anxiety you'll carry. Our range calculation uses a physics model that accounts for battery capacity (Wh), motor efficiency, aerodynamic drag at cruise speed, rolling resistance, and rider weight. Crucially, we apply a 0.65 real-world correction factor to translate ideal-condition physics into practical, conservative range estimates.</p>
<p>The range score is calculated at the scooter's most efficient cruise speed (typically 20–25 km/h), representing how far you could go on a single charge in optimal conditions. The scale is calibrated to reflect real commuter needs: 25 points (maximum) corresponds to 60+ km real-world range, sufficient for even long commutes with comfortable reserve. 0 points corresponds to under 10 km — barely useful outside toy territory.</p>
<p>Range score and efficiency score are related but distinct. A scooter with a massive battery but a power-hungry motor can score well on range while scoring poorly on efficiency (high running cost per km). A small-battery, ultra-efficient scooter might score modestly on range but excellently on efficiency. Both matter to different rider profiles.</p>`,
			},
			{
				id: 'speed-score',
				heading: 'Speed Score (20 Points)',
				content: `<p>Top speed carries 20 points — meaningful but deliberately not dominant. In most jurisdictions, electric scooters are legally limited to 25 km/h on public roads. A scooter capable of 45 km/h isn't necessarily more useful for commuting than one limited to 30 km/h; it may actually be ridden identically due to local laws. We weight speed lower than acceleration and range to reflect this reality.</p>
<p>The speed score is based on the scooter's calculated maximum sustainable speed — the speed at which motor output balances aerodynamic drag and rolling resistance for the standardised 75 kg rider on flat ground. This is different from the manufacturer's stated top speed, which is often the peak instantaneous value measured on a slight downhill with a light rider.</p>
<p>A score of 20 points (maximum) corresponds to a true 45+ km/h top speed, which is genuinely impressive and relevant for off-road or private-property use. 15–19 points covers 35–45 km/h, more than sufficient for any road-legal use. Below 10 points indicates a scooter that maxes out around 20–25 km/h, which may be limiting on mixed urban/suburban roads even within legal limits.</p>`,
			},
			{
				id: 'efficiency-score',
				heading: 'Efficiency Score (15 Points)',
				content: `<p>Efficiency measures watt-hours consumed per kilometre (Wh/km) at cruise speed. A lower Wh/km figure means lower running costs and — for a given battery — better range. Efficiency is awarded 15 points because it directly determines your electricity cost and the environmental impact of the scooter over its lifetime.</p>
<p>The efficiency score rewards scooters that extract more travel from each unit of energy. An efficient scooter consuming 12 Wh/km costs roughly half as much to run as an inefficient one consuming 25 Wh/km, assuming the same electricity rate. Over a 5,000 km annual commute at $0.25/kWh, that's a $16 vs $31 difference — modest in isolation, but compounding over years and rewarding buyers who consider total cost of ownership.</p>
<p>The score is calibrated so that 15 points corresponds to exceptional efficiency below 10 Wh/km — achievable by lightweight scooters with efficient hub motors at moderate speeds. 0 points corresponds to above 35 Wh/km, typical of heavy dual-motor performance scooters ridden aggressively. Most commuter scooters cluster between 15–25 Wh/km.</p>`,
			},
			{
				id: 'penalties',
				heading: 'Score Penalties: Accounting for Real-World Limitations',
				content: `<p>Raw physics scores can overstate a scooter's practical performance when known design limitations aren't captured in the headline specs. We apply a set of evidence-based penalties to the total score to correct for this. Penalties are applied after the four category scores are summed.</p>
<ul>
  <li><strong>Weight penalty:</strong> Scooters over 18 kg lose up to 5 points. Heavy scooters have worse power-to-weight ratios and impose real portability costs on users.</li>
  <li><strong>Battery size penalty:</strong> Very small batteries (under 200 Wh) lose up to 3 points because their range is so constrained that moderate range scores overstate usability.</li>
  <li><strong>Motor undersizing penalty:</strong> When rated battery capacity significantly exceeds what the motor can efficiently use, 1–3 points are deducted. This catches scooters with big batteries but weak motors.</li>
</ul>
<p>Penalties keep the score honest and prevent marketing-inflated specs from gaming the system. A scooter with a 500 Wh battery and a 150W motor shouldn't outscore a 360 Wh scooter with a 350W motor just because of battery size — the penalty system ensures it doesn't.</p>`,
			},
			{
				id: 'grade-system',
				heading: 'The Grade System: S Through F',
				content: `<p>To make scores immediately interpretable, each scooter receives a letter grade mapped to its point total. The grade boundaries are calibrated against the actual distribution of scooters in our database so that each grade represents a meaningful performance tier rather than an arbitrary cut-off.</p>
<ul>
  <li><strong>S Grade (85–100 pts) — Elite:</strong> Class-leading performance across all categories. These are the scooters that reviewers rave about and waiting lists form for. Excellent for demanding commutes, enthusiast riders, and anyone who wants the best available.</li>
  <li><strong>A Grade (70–84 pts) — Excellent:</strong> Strong performers that excel in at least two categories without serious weaknesses. The right choice for most serious commuters who want high performance without S-tier prices.</li>
  <li><strong>B Grade (55–69 pts) — Good:</strong> Solid all-rounders that handle typical urban commuting competently. Minor trade-offs in one or two areas but no serious deficiencies. The sweet spot for value-conscious buyers.</li>
  <li><strong>C Grade (40–54 pts) — Average:</strong> Adequate for light use on short, flat routes. Noticeable limitations in at least one important category. Consider carefully whether the limitations match your specific needs.</li>
  <li><strong>D Grade (25–39 pts) — Below Average:</strong> Meaningful limitations that will affect daily usability for most riders. Acceptable only for very light, occasional use.</li>
  <li><strong>F Grade (0–24 pts) — Poor:</strong> Significant performance deficiencies. These scooters may be fine as toys but are unsuitable for any serious commuting application.</li>
</ul>
<p>You can explore grades and scores for all scooters in our database on the <a href="/rankings" class="text-primary hover:text-primary-hover underline underline-offset-2">rankings page</a>, filtered by tier and sorted by score, price, or efficiency.</p>`,
			},
		],
	},
];

export function getGuideBySlug(slug: string): Guide | undefined {
	return guides.find((g) => g.slug === slug);
}
