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
// LIVE is what the BeatStars contracts say today (read Nov 20, 2026). NEXT is the ladder in
// docs/LICENSES.md: every tier beats the one below it, and Unlimited really is unlimited.
// When the contracts on BeatStars match NEXT, change LADDER to "next" and nothing else.
export const LADDER = "next" as "live" | "next"; // BeatStars contracts updated Nov 20, 2026

const LIVE: Record<string, string[]> = {
  basic: ["Untagged MP3", "Used for music recording", "Distribute up to 3,000 copies", "500,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)"],
  premium: ["Untagged MP3 + WAV", "Used for music recording", "Distribute up to 10,000 copies", "1,000,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)"],
  trackout: ["MP3 + WAV + stems", "Used for music recording", "Distribute up to 10,000 copies", "500,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)"],
  unlimited: ["MP3 + WAV + stems", "Used for music recording", "Distribute unlimited copies", "500,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)"],
  exclusive: ["Price is negotiated: make an offer on BeatStars", "Unlimited copies, streams and music videos", "For-profit live performances", "Radio broadcasting rights (unlimited stations)"],
};

const NEXT: Record<string, string[]> = {
  basic: ["Untagged MP3", "Used for music recording", "Distribute up to 3,000 copies", "500,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)", "Credit: Prod. NatFTP"],
  premium: ["Untagged MP3 + WAV", "Used for music recording", "Distribute up to 10,000 copies", "1,000,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)", "Credit: Prod. NatFTP"],
  trackout: ["Untagged MP3 + WAV + stems", "Used for music recording", "Distribute up to 10,000 copies", "1,000,000 online audio streams", "1 music video", "For-profit live performances", "Radio broadcasting rights (2 stations)", "Credit: Prod. NatFTP"],
  unlimited: ["Untagged MP3 + WAV + stems", "Used for music recording", "Unlimited copies", "Unlimited online audio streams", "Unlimited music videos", "For-profit live performances", "Radio broadcasting rights (unlimited stations)", "Credit: Prod. NatFTP"],
  exclusive: ["Price is negotiated: make an offer on BeatStars", "Untagged MP3 + WAV + stems", "Unlimited copies, streams, videos and stations", "The beat comes off the store", "Credit: Prod. NatFTP"],
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
