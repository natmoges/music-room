// The ladder, written the way it reads on the store. No deals.
export type License = { key: string; name: string; price: number | null; files: string; note: string };

export const LICENSES: License[] = [
  { key: "basic", name: "MP3 lease", price: 29.99, files: "Untagged MP3", note: "Limits in the license terms." },
  { key: "premium", name: "WAV lease", price: 49.99, files: "MP3 + WAV", note: "Limits in the license terms." },
  { key: "trackout", name: "Trackout", price: 99.99, files: "MP3 + WAV + stems", note: "Stems for your engineer. Limits in the terms." },
  { key: "unlimited", name: "Unlimited", price: 199.99, files: "MP3 + WAV + stems", note: "Higher limits. See the terms." },
  { key: "exclusive", name: "Exclusive", price: null, files: "MP3 + WAV + stems", note: "Negotiated on BeatStars." },
];

export const money = (n: number) => `$${n.toFixed(2)}`;

// Only the leases BeatStars actually sells for this beat, at the price it sells them.
// A beat synced before licenses were recorded falls back to the whole ladder.
export function licensesFor(offered?: Record<string, number>): License[] {
  if (!offered) return [];
  // Exclusive at 0 is BeatStars' "make an offer"; anything else shows the price the feed gave.
  return LICENSES.filter((l) => l.key in offered).map((l) => ({ ...l, price: l.key === "exclusive" && offered[l.key] === 0 ? null : offered[l.key] }));
}
