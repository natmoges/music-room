// The ladder, written the way it reads on the store. No deals.
export type License = { name: string; price: number | null; files: string; note: string };

export const LICENSES: License[] = [
  { name: "MP3 lease", price: 29.99, files: "Untagged MP3", note: "For a first release." },
  { name: "WAV lease", price: 49.99, files: "MP3 + WAV", note: "Full quality for the mix." },
  { name: "Trackout", price: 99.99, files: "MP3 + WAV + stems", note: "Every track, for your engineer." },
  { name: "Unlimited", price: 199.99, files: "MP3 + WAV + stems", note: "No caps on streams or sales." },
  { name: "Exclusive", price: null, files: "Everything, and it's yours alone", note: "Make an offer." },
];

export const money = (n: number) => `$${n.toFixed(2)}`;
