export type CoasterSummary = {
  id: string;
  name: string;
  park: string;
  country: string;
  manufacturer: string;
  type: string;
  active: boolean;
};

export type RideWithCoaster = {
  id: string;
  ridden_on: string;
  note: string | null;
  coaster_id: string;
  coasters: CoasterSummary | null;
};

export type Breakdown = { label: string; credits: number };

export type RideStats = {
  /** Distinct coasters ridden. Repeat rides never inflate this. */
  credits: number;
  /** Every ride row, including repeats. */
  totalRides: number;
  byCountry: Breakdown[];
  byManufacturer: Breakdown[];
  byType: Breakdown[];
  mostRidden: { name: string; park: string; rides: number } | null;
};

// The ride row a coaster attribute is counted from is arbitrary but stable:
// a coaster's country/manufacturer/type is a property of the coaster, so any of
// its ride rows yields the same answer. Grouping is therefore done over the set
// of distinct coasters, not over rides — otherwise repeat rides would inflate
// every breakdown the same way they would inflate the credit count.
function creditsByAttribute(
  rides: RideWithCoaster[],
  pick: (coaster: CoasterSummary) => string,
): Breakdown[] {
  const seenCoasters = new Set<string>();
  const counts = new Map<string, number>();

  for (const ride of rides) {
    const coaster = ride.coasters;
    if (!coaster || seenCoasters.has(coaster.id)) continue;
    seenCoasters.add(coaster.id);

    const label = pick(coaster);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, credits]) => ({ label, credits }))
    .sort((a, b) => b.credits - a.credits || a.label.localeCompare(b.label));
}

export function computeStats(rides: RideWithCoaster[]): RideStats {
  const distinctCoasters = new Set(rides.map((r) => r.coaster_id));

  const ridesPerCoaster = new Map<string, number>();
  for (const ride of rides) {
    ridesPerCoaster.set(ride.coaster_id, (ridesPerCoaster.get(ride.coaster_id) ?? 0) + 1);
  }

  // Resolve each coaster once up front rather than scanning the ride list
  // inside the loop below, which made this quadratic in the number of rides.
  const coasterById = new Map<string, CoasterSummary>();
  for (const ride of rides) {
    if (ride.coasters && !coasterById.has(ride.coaster_id)) {
      coasterById.set(ride.coaster_id, ride.coasters);
    }
  }

  let mostRidden: RideStats['mostRidden'] = null;
  for (const [coasterId, count] of ridesPerCoaster) {
    if (mostRidden && count <= mostRidden.rides) continue;
    const coaster = coasterById.get(coasterId);
    if (coaster) {
      mostRidden = { name: coaster.name, park: coaster.park, rides: count };
    }
  }

  return {
    credits: distinctCoasters.size,
    totalRides: rides.length,
    byCountry: creditsByAttribute(rides, (c) => c.country),
    byManufacturer: creditsByAttribute(rides, (c) => c.manufacturer),
    byType: creditsByAttribute(rides, (c) => c.type),
    mostRidden,
  };
}
