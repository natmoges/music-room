// The ladder, written the way it reads on the store. No deals.
export type License = { key: string; name: string; price: number | null; files: string; note: string };

export const LICENSES: License[] = [
  { key: "basic", name: "MP3 lease", price: 29.99, files: "Untagged MP3", note: "Limits in the license terms." },
  { key: "premium", name: "WAV lease", price: 49.99, files: "MP3 + WAV", note: "Limits in the license terms." },
  { key: "trackout", name: "Trackout", price: 99.99, files: "MP3 + WAV + stems", note: "Stems for your engineer. Limits in the terms." },
  { key: "unlimited", name: "Unlimited", price: 199.99, files: "MP3 + WAV + stems", note: "Unlimited copies. See the terms." },
  { key: "exclusive", name: "Exclusive", price: null, files: "MP3 + WAV + stems", note: "Negotiated on BeatStars." },
];

// What each contract allows, word for word from the "usage terms" in BeatStars' license picker.
// LIVE is the pre-Nov 20 ladder, kept as record. NEXT mirrors the BeatStars feature lists and
// NatFTP Lease v2.1 (live on all four tiers Nov 21, 2026): two music videos on capped tiers,
// unlimited live shows, the buyer owns their recording, 0% master points, 50/50 publishing.
// If the contracts change again, change NEXT to match the store word for word.
export const LADDER = "next" as "live" | "next"; // NatFTP Lease v2.1, Nov 21, 2026

const LIVE: Record<string, string[]> = {
  basic: ["Untagged MP3", "Used for music recording", "Distribute up to 3,000 copies", "500,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)"],
  premium: ["Untagged MP3 + WAV", "Used for music recording", "Distribute up to 10,000 copies", "1,000,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)"],
  trackout: ["MP3 + WAV + stems", "Used for music recording", "Distribute up to 10,000 copies", "500,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)"],
  unlimited: ["MP3 + WAV + stems", "Used for music recording", "Distribute unlimited copies", "500,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)"],
  exclusive: ["Price is negotiated: make an offer on BeatStars", "Unlimited copies, streams and music videos", "For-profit live performances", "Radio broadcasting rights (unlimited stations)"],
};

const NEXT: Record<string, string[]> = {
  basic: ["Untagged MP3", "Up to 3,000 copies", "500,000 monetized audio streams", "2 music videos (1 monetized, 1 non-monetized)", "100,000 monetized · 500,000 non-monetized video plays", "2 radio stations", "Unlimited live shows", "You own your recording · 0% master points · 50/50 publishing", "Credit: Prod. NatFTP"],
  premium: ["Untagged MP3 + WAV", "Up to 10,000 copies", "1,000,000 monetized audio streams", "2 music videos (1 monetized, 1 non-monetized)", "750,000 monetized · 1,000,000 non-monetized video plays", "2 radio stations", "Unlimited live shows", "You own your recording · 0% master points · 50/50 publishing", "Credit: Prod. NatFTP"],
  trackout: ["Untagged MP3 + WAV + stems", "Up to 10,000 copies", "1,000,000 monetized audio streams", "2 music videos (1 monetized, 1 non-monetized)", "1,000,000 monetized · 1,000,000 non-monetized video plays", "2 radio stations", "Unlimited live shows", "You own your recording · 0% master points · 50/50 publishing", "Credit: Prod. NatFTP"],
  unlimited: ["Untagged MP3 + WAV + stems", "Unlimited copies and audio streams", "Unlimited music videos and video plays", "Unlimited radio stations", "Unlimited live shows", "You own your recording · 0% master points · 50/50 publishing", "Credit: Prod. NatFTP"],
  exclusive: ["Price is negotiated: make an offer on BeatStars", "Untagged MP3 + WAV + stems", "Exclusive rights from the sale on, set in a signed agreement", "The beat comes off the store", "Existing leases keep running to their end", "Credit: Prod. NatFTP"],
};

export const TERMS = LADDER === "next" ? NEXT : LIVE;

export const money = (n: number) => `$${n.toFixed(2)}`;

// Only the leases BeatStars actually sells for this beat, at the price it sells them.
// A beat synced before licenses were recorded falls back to the whole ladder.
export function licensesFor(offered?: Record<string, number>): License[] {
  if (!offered) return [];
  // Exclusive at 0 is BeatStars' "make an offer"; anything else shows the price the feed gave.
  return LICENSES.filter((l) => l.key in offered).map((l) => ({ ...l, price: l.key === "exclusive" && offered[l.key] === 0 ? null : offered[l.key] }));
}
